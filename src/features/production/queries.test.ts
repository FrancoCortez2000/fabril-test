import type { TableParams } from "@/components/data-table/params";

vi.mock("server-only", () => ({}));

type Call = [string, ...unknown[]];

const db = vi.hoisted(() => ({
  calls: [] as Call[],
  responses: [] as {
    data: unknown[];
    count?: number;
    error?: { message: string; code?: string } | null;
  }[],
  tables: {} as Record<string, { data: unknown; error?: { message: string } | null }>,
}));

vi.mock("@/lib/supabase/server", () => {
  function builder(table: string) {
    const b: Record<string, unknown> = {};
    for (const method of ["select", "eq", "in", "is", "or", "order", "range", "maybeSingle"]) {
      b[method] = (...args: unknown[]) => {
        db.calls.push([`${table}.${method}`, ...args]);
        return b;
      };
    }
    b.then = (resolve: (v: unknown) => unknown) => {
      const single = db.calls.some((c) => c[0] === `${table}.maybeSingle`);
      if (db.tables[table]) {
        const entry = db.tables[table]!;
        const data = single
          ? Array.isArray(entry.data)
            ? (entry.data[0] ?? null)
            : entry.data
          : entry.data;
        return resolve({ data, error: entry.error ?? null });
      }
      return resolve(db.responses.shift() ?? { data: [], count: 0, error: null });
    };
    return b;
  }
  return { createClient: async () => ({ from: (t: string) => builder(t) }) };
});

import { getOrder, listOrders, ORDER_TABLE_OPTIONS } from "@/features/production/queries";

const ORG = "99999999-9999-4999-8999-999999999999";
const OP = "11111111-1111-4111-8111-111111111111";
const called = (name: string) => db.calls.filter((c) => c[0] === name);

const params = (over: Partial<TableParams> = {}): TableParams => ({
  page: 1,
  pageSize: 25,
  sort: { id: "plannedEndDate", desc: false },
  q: "",
  filters: {},
  ...over,
});

const OVERVIEW = {
  id: OP,
  code: "OP-2026-0056",
  status: "in_progress",
  priority: "high",
  item_id: "22222222-2222-4222-8222-222222222222",
  item_name: "Balde 10 L rojo",
  item_sku: "BAL-10L",
  unit_code: "u",
  planned_qty: 900,
  good_qty: 300,
  defective_qty: 12,
  progress_pct: 33,
  is_delayed: true,
  planned_start_date: "2026-11-01",
  planned_end_date: "2026-11-30",
  notes: "Urgente para cliente",
  planned_material_cost: 100000,
  planned_labor_cost: 20000,
  planned_overhead_cost: 5000,
  actual_material_cost: null,
  actual_labor_cost: null,
  actual_overhead_cost: null,
  actual_unit_cost: null,
  started_at: "2026-11-02T12:00:00+00:00",
  completed_at: null,
  cancelled_at: null,
  cancel_reason: null,
};

const ROW = {
  id: OP,
  code: "OP-2026-0056",
  status: "in_progress",
  priority: "high",
  itemId: "22222222-2222-4222-8222-222222222222",
  itemName: "Balde 10 L rojo",
  itemSku: "BAL-10L",
  unitCode: "u",
  plannedQty: 900,
  goodQty: 300,
  defectiveQty: 12,
  progressPct: 33,
  isDelayed: true,
  plannedStartDate: "2026-11-01",
  plannedEndDate: "2026-11-30",
};

beforeEach(() => {
  db.calls = [];
  db.tables = {};
  db.responses = [{ data: [OVERVIEW], count: 1 }];
});

describe("listOrders", () => {
  test("sólo la fábrica activa y mapea la fila", async () => {
    const { rows, total } = await listOrders(ORG, params());
    expect(called("production_order_overview.eq")).toContainEqual([
      "production_order_overview.eq",
      "organization_id",
      ORG,
    ]);
    expect(total).toBe(1);
    expect(rows).toEqual([ROW]);
  });

  test("filtra por estado y prioridad descartando valores inválidos", async () => {
    await listOrders(
      ORG,
      params({ filters: { estado: ["planned", "hack"], prioridad: ["urgent", "zzz", "low"] } }),
    );
    expect(called("production_order_overview.in")).toEqual(
      expect.arrayContaining([
        ["production_order_overview.in", "status", ["planned"]],
        ["production_order_overview.in", "priority", ["urgent", "low"]],
      ]),
    );
  });

  test("demorada=1 filtra las demoradas; cualquier otro valor no filtra", async () => {
    await listOrders(ORG, params({ filters: { demorada: ["1"] } }));
    expect(called("production_order_overview.eq")).toContainEqual([
      "production_order_overview.eq",
      "is_delayed",
      true,
    ]);
    db.calls = [];
    db.responses = [{ data: [], count: 0 }];
    await listOrders(ORG, params({ filters: { demorada: ["si"] } }));
    expect(called("production_order_overview.eq")).not.toContainEqual([
      "production_order_overview.eq",
      "is_delayed",
      true,
    ]);
  });

  test("la búsqueda usa sólo el texto sanitizado, sobre código y producto", async () => {
    await listOrders(ORG, params({ q: "balde,(10)*" }));
    expect(called("production_order_overview.or")[0]?.[1]).toBe(
      "code.ilike.%balde 10%,item_name.ilike.%balde 10%",
    );
  });

  test.each([
    ["code", "code"],
    ["plannedEndDate", "planned_end_date"],
    ["progress", "progress_pct"],
    ["priority", "planned_end_date"],
    ["inventada", "planned_end_date"],
  ])("ordena por %s sobre %s con desempate por id", async (id, column) => {
    await listOrders(ORG, params({ sort: { id, desc: false } }));
    const orders = called("production_order_overview.order");
    expect(orders[0]?.[1]).toBe(column);
    expect(orders[1]?.[1]).toBe("id");
  });

  test("una página fuera de rango (PGRST103) termina en la ÚLTIMA página", async () => {
    db.responses = [
      { data: [], count: 0, error: { message: "offset", code: "PGRST103" } },
      { data: [OVERVIEW], count: 60 },
      { data: [OVERVIEW], count: 60 },
    ];
    await listOrders(ORG, params({ page: 999 }));
    expect(called("production_order_overview.range").at(-1)).toEqual([
      "production_order_overview.range",
      50,
      74,
    ]);
  });

  test("si la base falla, lanza el error", async () => {
    db.responses = [{ data: [], count: 0, error: { message: "boom" } }];
    await expect(listOrders(ORG, params())).rejects.toMatchObject({ message: "boom" });
  });

  test("opciones de la tabla", () => {
    expect(ORDER_TABLE_OPTIONS.sortable).toEqual(["code", "plannedEndDate", "progress"]);
    expect(ORDER_TABLE_OPTIONS.filterable).toEqual(["estado", "prioridad", "demorada"]);
    expect(ORDER_TABLE_OPTIONS.defaultSort).toEqual({ id: "plannedEndDate", desc: false });
  });
});

describe("getOrder", () => {
  test("arma la orden con costos, materiales, equipo, partes y eventos", async () => {
    db.tables.production_order_overview = { data: [OVERVIEW] };
    db.tables.production_material_details = {
      data: [
        {
          id: "m1",
          item_id: "i1",
          item_name: "PP",
          item_sku: "PP",
          unit_code: "kg",
          planned_qty: 378,
          consumed_qty: 378,
          returned_qty: 0,
          scrap_qty: 2.5,
          waste_pct: 3,
          cost_consumed: 90000,
          available: 120,
        },
      ],
    };
    db.tables.production_team = {
      data: [
        {
          id: "t1",
          employee_id: "e1",
          first_name: "Juan",
          last_name: "Sosa",
          position: "Operario",
          role_in_order: "responsable",
          hours_worked: 12.5,
        },
      ],
    };
    db.tables.production_report_details = {
      data: [
        {
          id: "r1",
          report_date: "2026-11-05",
          good_qty: 300,
          defective_qty: 12,
          notes: "Primer turno",
          employee_name: "Juan Sosa",
          created_at: "2026-11-05T20:00:00+00:00",
        },
      ],
    };
    db.tables.production_event_details = {
      data: [
        {
          id: "ev1",
          from_status: null,
          to_status: "planned",
          note: null,
          occurred_at: "2026-11-01T12:00:00+00:00",
        },
      ],
    };
    const result = await getOrder(ORG, OP);
    expect(result?.order).toMatchObject({
      ...ROW,
      notes: "Urgente para cliente",
      plannedMaterialCost: 100000,
      plannedLaborCost: 20000,
      plannedOverheadCost: 5000,
      actualMaterialCost: null,
      actualUnitCost: null,
      startedAt: "2026-11-02T12:00:00+00:00",
      cancelReason: null,
    });
    expect(result?.materials).toEqual([
      {
        id: "m1",
        itemId: "i1",
        itemName: "PP",
        sku: "PP",
        unitCode: "kg",
        plannedQty: 378,
        consumedQty: 378,
        returnedQty: 0,
        scrapQty: 2.5,
        wastePct: 3,
        costConsumed: 90000,
        available: 120,
      },
    ]);
    expect(result?.team).toEqual([
      {
        id: "t1",
        employeeId: "e1",
        name: "Juan Sosa",
        position: "Operario",
        role: "responsable",
        hoursWorked: 12.5,
      },
    ]);
    expect(result?.reports[0]).toMatchObject({ goodQty: 300, employeeName: "Juan Sosa" });
    expect(result?.events[0]).toEqual({
      id: "ev1",
      fromStatus: null,
      toStatus: "planned",
      note: null,
      occurredAt: "2026-11-01T12:00:00+00:00",
    });
    expect(called("production_material_details.eq")).toContainEqual([
      "production_material_details.eq",
      "production_order_id",
      OP,
    ]);
    expect(called("production_report_details.order")[0]?.[1]).toBe("report_date");
    expect(called("production_event_details.order")[0]?.[1]).toBe("occurred_at");
  });

  test("devuelve null si la orden no existe en la fábrica", async () => {
    db.tables.production_order_overview = { data: [] };
    expect(await getOrder(ORG, OP)).toBeNull();
  });

  test("un id que no es UUID no consulta la base", async () => {
    expect(await getOrder(ORG, "no-es-uuid")).toBeNull();
    expect(db.calls).toEqual([]);
  });

  test("si la base falla, lanza el error", async () => {
    db.tables.production_order_overview = { data: null, error: { message: "boom" } };
    await expect(getOrder(ORG, OP)).rejects.toMatchObject({ message: "boom" });
  });
});
