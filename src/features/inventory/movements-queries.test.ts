import type { TableParams } from "@/components/data-table/params";

vi.mock("server-only", () => ({}));

type Call = [string, ...unknown[]];

const db = vi.hoisted(() => ({
  calls: [] as Call[],
  responses: [] as { data: unknown[]; count?: number; error?: { message: string } | null }[],
}));

vi.mock("@/lib/supabase/server", () => {
  function builder(table: string) {
    const b: Record<string, unknown> = {};
    for (const method of ["select", "eq", "in", "is", "or", "gte", "lte", "order", "range"]) {
      b[method] = (...args: unknown[]) => {
        db.calls.push([`${table}.${method}`, ...args]);
        return b;
      };
    }
    b.then = (resolve: (v: unknown) => unknown) =>
      resolve(db.responses.shift() ?? { data: [], count: 0, error: null });
    return b;
  }
  return { createClient: async () => ({ from: (t: string) => builder(t) }) };
});

import {
  dateRange,
  listItemOptions,
  listMovements,
  MOVEMENT_TABLE_OPTIONS,
} from "@/features/inventory/queries";

const ORG = "99999999-9999-4999-8999-999999999999";
const ITEM = "11111111-1111-4111-8111-111111111111";
const called = (name: string) => db.calls.filter((c) => c[0] === name);

const params = (over: Partial<TableParams> = {}): TableParams => ({
  page: 1,
  pageSize: 25,
  sort: { id: "occurredAt", desc: true },
  q: "",
  filters: {},
  ...over,
});

const FEED = {
  id: "m1",
  item_id: ITEM,
  item_name: "PEAD",
  item_sku: "PEAD",
  unit_code: "kg",
  movement_type: "manual_in",
  quantity: 10,
  unit_cost: 50,
  total_cost: 500,
  balance_after: 110,
  reason: "Conteo físico",
  occurred_at: "2026-10-01T15:00:00+00:00",
  reference: null,
  reversible: true,
  reversed: false,
};

beforeEach(() => {
  db.calls = [];
  db.responses = [{ data: [FEED], count: 1 }];
});

describe("dateRange", () => {
  test("acepta fechas válidas en orden", () => {
    expect(dateRange({ desde: ["2026-10-01"], hasta: ["2026-10-31"] })).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
  });

  test("puede venir sólo un extremo", () => {
    expect(dateRange({ desde: ["2026-10-01"] })).toEqual({ from: "2026-10-01", to: null });
    expect(dateRange({ hasta: ["2026-10-31"] })).toEqual({ from: null, to: "2026-10-31" });
  });

  test.each([
    ["texto", { desde: ["ayer"] }],
    ["fecha imposible", { desde: ["2026-02-31"] }],
    ["formato argentino", { hasta: ["31/10/2026"] }],
  ])("ignora %s", (_name, filters) => {
    expect(dateRange(filters)).toEqual({ from: null, to: null });
  });

  test("si desde es posterior a hasta, ignora ambas", () => {
    expect(dateRange({ desde: ["2026-11-01"], hasta: ["2026-10-01"] })).toEqual({
      from: null,
      to: null,
    });
  });
});

describe("listMovements", () => {
  test("sólo la fábrica activa, del más nuevo al más viejo por defecto", async () => {
    await listMovements(ORG, params());
    expect(called("movement_feed.eq")).toContainEqual(["movement_feed.eq", "organization_id", ORG]);
    const orders = called("movement_feed.order");
    expect(orders[0]?.[1]).toBe("occurred_at");
    expect(orders[0]?.[2]).toMatchObject({ ascending: false });
    expect(orders[1]?.[1]).toBe("id");
  });

  test("mapea la fila al formato de la tabla", async () => {
    const { rows, total } = await listMovements(ORG, params());
    expect(total).toBe(1);
    expect(rows[0]).toEqual({
      id: "m1",
      occurredAt: "2026-10-01T15:00:00+00:00",
      itemId: ITEM,
      itemName: "PEAD",
      sku: "PEAD",
      unitCode: "kg",
      type: "manual_in",
      quantity: 10,
      unitCost: 50,
      totalCost: 500,
      balanceAfter: 110,
      reason: "Conteo físico",
      reference: null,
      reversible: true,
      reversed: false,
    });
  });

  test("filtra por tipo, ítem y fechas; descarta valores inválidos", async () => {
    await listMovements(
      ORG,
      params({
        filters: {
          tipo: ["manual_in", "hack"],
          item: [ITEM, "no-es-uuid"],
          desde: ["2026-10-01"],
          hasta: ["2026-10-31"],
        },
      }),
    );
    expect(called("movement_feed.in")).toEqual(
      expect.arrayContaining([
        ["movement_feed.in", "movement_type", ["manual_in"]],
        ["movement_feed.in", "item_id", [ITEM]],
      ]),
    );
    expect(called("movement_feed.gte")).toContainEqual([
      "movement_feed.gte",
      "occurred_at",
      "2026-10-01T00:00:00-03:00",
    ]);
    expect(called("movement_feed.lte")).toContainEqual([
      "movement_feed.lte",
      "occurred_at",
      "2026-10-31T23:59:59.999-03:00",
    ]);
  });

  test("la búsqueda usa sólo el texto sanitizado sobre ítem, motivo y documento", async () => {
    await listMovements(ORG, params({ q: "OC-2026,(1)*" }));
    expect(called("movement_feed.or")[0]?.[1]).toBe(
      "item_name.ilike.%OC-2026 1%,item_sku.ilike.%OC-2026 1%,reason.ilike.%OC-2026 1%,reference.ilike.%OC-2026 1%",
    );
  });

  test.each([
    ["occurredAt", "occurred_at"],
    ["quantity", "quantity"],
    ["inventada", "occurred_at"],
  ])("ordena por %s sobre %s", async (id, column) => {
    await listMovements(ORG, params({ sort: { id, desc: false } }));
    expect(called("movement_feed.order")[0]?.[1]).toBe(column);
  });

  test("pagina con rango y, si la página queda más allá del final, devuelve la última", async () => {
    db.responses = [
      { data: [], count: 12 },
      { data: [FEED], count: 12 },
    ];
    const { rows, total } = await listMovements(ORG, params({ page: 9, pageSize: 10 }));
    expect(total).toBe(12);
    expect(rows).toHaveLength(1);
    expect(called("movement_feed.range").at(-1)).toEqual(["movement_feed.range", 10, 19]);
  });

  test("una página fuera de rango (PGRST103) vuelve a la primera en lugar de romper", async () => {
    db.responses = [
      { data: [], count: 0, error: { message: "offset", code: "PGRST103" } as never },
      { data: [FEED], count: 1 },
    ];
    const { rows } = await listMovements(ORG, params({ page: 999 }));
    expect(rows).toHaveLength(1);
    expect(called("item_catalog.range").concat(called("movement_feed.range")).at(-1)).toEqual([
      expect.stringMatching(/.range$/),
      0,
      24,
    ]);
  });

  test("una página fuera de rango termina en la ÚLTIMA página, coherente con el paginador", async () => {
    db.responses = [
      { data: [], count: 0, error: { message: "offset", code: "PGRST103" } as never },
      { data: [FEED], count: 60 },
      { data: [FEED], count: 60 },
    ];
    await listMovements(ORG, params({ page: 999 }));
    expect(called("movement_feed.range").at(-1)).toEqual(["movement_feed.range", 50, 74]);
  });

  test("si la base falla, lanza el error", async () => {
    db.responses = [{ data: [], count: 0, error: { message: "boom" } }];
    await expect(listMovements(ORG, params())).rejects.toMatchObject({ message: "boom" });
  });
});

test("opciones de la tabla: orden y filtros permitidos", () => {
  expect(MOVEMENT_TABLE_OPTIONS.sortable).toEqual(["occurredAt", "quantity"]);
  expect(MOVEMENT_TABLE_OPTIONS.filterable).toEqual(["tipo", "item", "desde", "hasta"]);
  expect(MOVEMENT_TABLE_OPTIONS.defaultSort).toEqual({ id: "occurredAt", desc: true });
});

describe("listItemOptions", () => {
  test("ítems activos de la fábrica por nombre", async () => {
    db.responses = [{ data: [{ id: ITEM, name: "PEAD", sku: "PEAD", type: "raw_material" }] }];
    expect(await listItemOptions(ORG)).toEqual([
      { id: ITEM, name: "PEAD", sku: "PEAD", type: "raw_material" },
    ]);
    expect(called("item_catalog.eq")).toContainEqual(["item_catalog.eq", "organization_id", ORG]);
    expect(called("item_catalog.order")[0]?.[1]).toBe("name");
  });
});
