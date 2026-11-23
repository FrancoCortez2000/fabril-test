import type { TableParams } from "@/components/data-table/params";

vi.mock("server-only", () => ({}));

type Call = [string, ...unknown[]];

const db = vi.hoisted(() => ({
  calls: [] as Call[],
  /** Respuestas en orden para consultas con `count` (listas). */
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

import { getPurchase, listPurchases, PURCHASE_TABLE_OPTIONS } from "@/features/purchasing/queries";

const ORG = "99999999-9999-4999-8999-999999999999";
const PO = "11111111-1111-4111-8111-111111111111";
const called = (name: string) => db.calls.filter((c) => c[0] === name);

const params = (over: Partial<TableParams> = {}): TableParams => ({
  page: 1,
  pageSize: 25,
  sort: { id: "orderDate", desc: true },
  q: "",
  filters: {},
  ...over,
});

const OVERVIEW = {
  id: PO,
  code: "OC-2026-0001",
  status: "partially_received",
  order_date: "2026-09-01",
  expected_date: "2026-10-01",
  notes: null,
  subtotal: 13000,
  tax_total: 2730,
  total: 15730,
  cancel_reason: null,
  supplier_id: "22222222-2222-4222-8222-222222222222",
  supplier_name: "Petroquímica Sur",
  line_count: 2,
  received_pct: 50,
  is_late: true,
};

const MAPPED = {
  id: PO,
  code: "OC-2026-0001",
  status: "partially_received",
  orderDate: "2026-09-01",
  expectedDate: "2026-10-01",
  notes: null,
  subtotal: 13000,
  taxTotal: 2730,
  total: 15730,
  cancelReason: null,
  supplierId: "22222222-2222-4222-8222-222222222222",
  supplierName: "Petroquímica Sur",
  lineCount: 2,
  receivedPct: 50,
  isLate: true,
};

beforeEach(() => {
  db.calls = [];
  db.tables = {};
  db.responses = [{ data: [OVERVIEW], count: 1 }];
});

describe("listPurchases", () => {
  test("sólo la fábrica activa y mapea la fila", async () => {
    const { rows, total } = await listPurchases(ORG, params());
    expect(called("purchase_overview.eq")).toContainEqual([
      "purchase_overview.eq",
      "organization_id",
      ORG,
    ]);
    expect(total).toBe(1);
    expect(rows).toEqual([MAPPED]);
  });

  test("filtra por estado y descarta los inválidos", async () => {
    await listPurchases(ORG, params({ filters: { estado: ["pending", "hack", "received"] } }));
    expect(called("purchase_overview.in")).toContainEqual([
      "purchase_overview.in",
      "status",
      ["pending", "received"],
    ]);
  });

  test("la búsqueda usa sólo el texto sanitizado, sobre código y proveedor", async () => {
    await listPurchases(ORG, params({ q: "OC-2026,(1)*" }));
    expect(called("purchase_overview.or")[0]?.[1]).toBe(
      "code.ilike.%OC-2026 1%,supplier_name.ilike.%OC-2026 1%",
    );
  });

  test.each([
    ["code", "code"],
    ["orderDate", "order_date"],
    ["expectedDate", "expected_date"],
    ["total", "total"],
    ["inventada", "order_date"],
  ])("ordena por %s sobre %s con desempate por id", async (id, column) => {
    await listPurchases(ORG, params({ sort: { id, desc: false } }));
    const orders = called("purchase_overview.order");
    expect(orders[0]?.[1]).toBe(column);
    expect(orders[1]?.[1]).toBe("id");
  });

  test("pagina con rango", async () => {
    await listPurchases(ORG, params({ page: 2, pageSize: 10 }));
    expect(called("purchase_overview.range")).toContainEqual(["purchase_overview.range", 10, 19]);
  });

  test("una página fuera de rango (PGRST103) termina en la ÚLTIMA página", async () => {
    db.responses = [
      { data: [], count: 0, error: { message: "offset", code: "PGRST103" } },
      { data: [OVERVIEW], count: 60 },
      { data: [OVERVIEW], count: 60 },
    ];
    await listPurchases(ORG, params({ page: 999 }));
    expect(called("purchase_overview.range").at(-1)).toEqual(["purchase_overview.range", 50, 74]);
  });

  test("si la base falla, lanza el error", async () => {
    db.responses = [{ data: [], count: 0, error: { message: "boom" } }];
    await expect(listPurchases(ORG, params())).rejects.toMatchObject({ message: "boom" });
  });

  test("opciones de la tabla", () => {
    expect(PURCHASE_TABLE_OPTIONS.sortable).toEqual(["code", "orderDate", "expectedDate", "total"]);
    expect(PURCHASE_TABLE_OPTIONS.filterable).toEqual(["estado"]);
    expect(PURCHASE_TABLE_OPTIONS.defaultSort).toEqual({ id: "orderDate", desc: true });
  });
});

describe("getPurchase", () => {
  test("devuelve la orden con sus líneas", async () => {
    db.tables.purchase_overview = { data: [OVERVIEW] };
    db.tables.purchase_line_details = {
      data: [
        {
          id: "l1",
          item_id: "i1",
          item_name: "PEAD",
          item_sku: "PEAD",
          unit_code: "kg",
          quantity: 100,
          unit_price: 50,
          tax_rate: 21,
          received_qty: 100,
          pending_qty: 0,
          line_total: 5000,
        },
      ],
    };
    const result = await getPurchase(ORG, PO);
    expect(result?.purchase).toEqual(MAPPED);
    expect(result?.lines).toEqual([
      {
        id: "l1",
        itemId: "i1",
        itemName: "PEAD",
        sku: "PEAD",
        unitCode: "kg",
        quantity: 100,
        unitPrice: 50,
        taxRate: 21,
        receivedQty: 100,
        pendingQty: 0,
        lineTotal: 5000,
      },
    ]);
    expect(called("purchase_overview.eq")).toEqual(
      expect.arrayContaining([
        ["purchase_overview.eq", "id", PO],
        ["purchase_overview.eq", "organization_id", ORG],
      ]),
    );
    expect(called("purchase_line_details.eq")).toContainEqual([
      "purchase_line_details.eq",
      "purchase_order_id",
      PO,
    ]);
  });

  test("devuelve null si la orden no existe en la fábrica", async () => {
    db.tables.purchase_overview = { data: [] };
    expect(await getPurchase(ORG, PO)).toBeNull();
  });

  test("un id que no es UUID no consulta la base", async () => {
    expect(await getPurchase(ORG, "no-es-uuid")).toBeNull();
    expect(db.calls).toEqual([]);
  });

  test("si la base falla, lanza el error", async () => {
    db.tables.purchase_overview = { data: null, error: { message: "boom" } };
    await expect(getPurchase(ORG, PO)).rejects.toMatchObject({ message: "boom" });
  });
});
