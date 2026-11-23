vi.mock("server-only", () => ({}));

type Call = [string, ...unknown[]];

const db = vi.hoisted(() => ({
  calls: [] as Call[],
  tables: {} as Record<string, { data: unknown; error?: { message: string } | null }>,
}));

vi.mock("@/lib/supabase/server", () => {
  function builder(table: string) {
    const b: Record<string, unknown> = {};
    for (const method of ["select", "eq", "in", "is", "order", "limit", "maybeSingle", "single"]) {
      b[method] = (...args: unknown[]) => {
        db.calls.push([`${table}.${method}`, ...args]);
        return b;
      };
    }
    b.then = (resolve: (v: unknown) => unknown) => {
      const entry = db.tables[table] ?? { data: [] };
      const asSingle = db.calls.some((c) => c[0] === `${table}.maybeSingle`);
      const data = asSingle
        ? Array.isArray(entry.data)
          ? (entry.data[0] ?? null)
          : entry.data
        : entry.data;
      return resolve({ data, error: entry.error ?? null });
    };
    return b;
  }
  return { createClient: async () => ({ from: (t: string) => builder(t) }) };
});

import {
  getItem,
  listItemMovements,
  listProductOrders,
  listRecentPurchases,
  listSuppliers,
  listUsedIn,
} from "@/features/items/detail-queries";

const ORG = "99999999-9999-4999-8999-999999999999";
const ID = "11111111-1111-4111-8111-111111111111";
const called = (name: string) => db.calls.filter((c) => c[0] === name);

const CATALOG = {
  id: ID,
  type: "finished_good",
  sku: "BID",
  name: "Bidón",
  description: null,
  category_id: null,
  category_name: null,
  unit_id: 3,
  unit_code: "u",
  min_stock: 10,
  current_stock: 50,
  avg_cost: 0,
  last_purchase_cost: null,
  sale_price: 2850,
  standard_labor_minutes: 15,
  overhead_per_unit: 20,
  preferred_supplier_id: null,
  status: "active",
  archived_at: null,
  level: "ok",
  committed: 5,
  available: 45,
  standard_cost: 1778,
  cost: 1778,
  has_movements: true,
};

beforeEach(() => {
  db.calls = [];
  db.tables = {};
});

describe("getItem", () => {
  test("devuelve el ítem con su desglose de costo y margen", async () => {
    db.tables.item_catalog = { data: [CATALOG] };
    db.tables.item_costing = {
      data: [{ materials_cost: 258, labor_cost: 1500, overhead_cost: 20, standard_cost: 1778 }],
    };
    const detail = await getItem(ORG, ID);
    expect(detail?.item).toMatchObject({
      id: ID,
      type: "finished_good",
      unitCode: "u",
      standardLaborMinutes: 15,
      overheadPerUnit: 20,
      committed: 5,
      available: 45,
      hasMovements: true,
    });
    expect(detail?.costing).toEqual({ materials: 258, labor: 1500, overhead: 20, standard: 1778 });
    expect(detail?.marginPct).toBeCloseTo(37.61, 2);
    expect(called("item_catalog.eq")).toEqual(
      expect.arrayContaining([
        ["item_catalog.eq", "id", ID],
        ["item_catalog.eq", "organization_id", ORG],
      ]),
    );
  });

  test("un producto sin receta no tiene desglose ni margen (no es cero)", async () => {
    db.tables.item_catalog = { data: [{ ...CATALOG, standard_cost: null, cost: null }] };
    db.tables.item_costing = {
      data: [{ materials_cost: null, labor_cost: 0, overhead_cost: 0, standard_cost: null }],
    };
    const detail = await getItem(ORG, ID);
    expect(detail?.costing).toBeNull();
    expect(detail?.marginPct).toBeNull();
  });

  test("una materia prima no tiene costo estándar ni margen", async () => {
    db.tables.item_catalog = {
      data: [
        { ...CATALOG, type: "raw_material", sale_price: null, standard_cost: null, cost: 1000 },
      ],
    };
    const detail = await getItem(ORG, ID);
    expect(detail?.costing).toBeNull();
    expect(detail?.marginPct).toBeNull();
    expect(called("item_costing.eq")).toEqual([]);
  });

  test("devuelve null si el ítem no existe en la fábrica", async () => {
    db.tables.item_catalog = { data: [] };
    expect(await getItem(ORG, ID)).toBeNull();
  });

  test("un id que no es UUID ni consulta la base", async () => {
    expect(await getItem(ORG, "no-es-uuid")).toBeNull();
    expect(db.calls).toEqual([]);
  });
});

describe("listas de la ficha", () => {
  test("movimientos del ítem: de más nuevo a más viejo y con límite", async () => {
    db.tables.movement_feed = {
      data: [
        {
          id: "m1",
          organization_id: ORG,
          item_id: ID,
          item_name: "PEAD",
          item_sku: "PEAD",
          unit_code: "kg",
          movement_type: "purchase_receipt",
          quantity: 100,
          unit_cost: 50,
          total_cost: 5000,
          balance_after: 100,
          reason: null,
          occurred_at: "2026-10-01T15:00:00+00:00",
          reference: "OC-2026-0001",
          reversible: false,
          reversed: false,
        },
      ],
    };
    const rows = await listItemMovements(ORG, ID, 20);
    expect(rows).toEqual([
      {
        id: "m1",
        occurredAt: "2026-10-01T15:00:00+00:00",
        itemId: ID,
        itemName: "PEAD",
        sku: "PEAD",
        unitCode: "kg",
        type: "purchase_receipt",
        quantity: 100,
        unitCost: 50,
        totalCost: 5000,
        balanceAfter: 100,
        reason: null,
        reference: "OC-2026-0001",
        reversible: false,
        reversed: false,
      },
    ]);
    expect(called("movement_feed.order")[0]).toEqual([
      "movement_feed.order",
      "occurred_at",
      { ascending: false },
    ]);
    expect(called("movement_feed.limit")).toContainEqual(["movement_feed.limit", 20]);
    expect(called("movement_feed.eq")).toEqual(
      expect.arrayContaining([
        ["movement_feed.eq", "item_id", ID],
        ["movement_feed.eq", "organization_id", ORG],
      ]),
    );
  });

  test("usado en: productos cuya receta lleva la materia prima", async () => {
    db.tables.bom_usage = {
      data: [
        {
          product_id: "p1",
          product_name: "Bidón",
          product_sku: "BID",
          quantity: 0.25,
          waste_pct: null,
          output_qty: 1,
        },
      ],
    };
    expect(await listUsedIn(ORG, ID)).toEqual([
      {
        productId: "p1",
        productName: "Bidón",
        productSku: "BID",
        quantity: 0.25,
        wastePct: null,
        outputQty: 1,
      },
    ]);
    expect(called("bom_usage.eq")).toContainEqual(["bom_usage.eq", "item_id", ID]);
  });

  test("compras recientes: las últimas primero y con proveedor", async () => {
    db.tables.item_purchase_lines = {
      data: [
        {
          purchase_id: "po1",
          purchase_code: "OC-2026-0001",
          status: "received",
          order_date: "2026-10-01",
          expected_date: null,
          quantity: 100,
          received_qty: 100,
          unit_price: 50,
          supplier_name: "Petroquímica Sur",
        },
      ],
    };
    const rows = await listRecentPurchases(ORG, ID, 5);
    expect(rows[0]).toMatchObject({
      purchaseId: "po1",
      code: "OC-2026-0001",
      status: "received",
      orderDate: "2026-10-01",
      unitPrice: 50,
      supplierName: "Petroquímica Sur",
    });
    expect(called("item_purchase_lines.order")[0]?.[1]).toBe("order_date");
    expect(called("item_purchase_lines.limit")).toContainEqual(["item_purchase_lines.limit", 5]);
  });

  test("órdenes del producto: progreso y demora", async () => {
    db.tables.production_order_overview = {
      data: [
        {
          id: "o1",
          code: "OP-2026-0001",
          status: "in_progress",
          planned_qty: 100,
          good_qty: 40,
          progress_pct: 40,
          is_delayed: true,
          planned_end_date: "2026-11-05",
        },
      ],
    };
    expect(await listProductOrders(ORG, ID, 10)).toEqual([
      {
        id: "o1",
        code: "OP-2026-0001",
        status: "in_progress",
        plannedQty: 100,
        goodQty: 40,
        progressPct: 40,
        isDelayed: true,
        plannedEndDate: "2026-11-05",
      },
    ]);
    expect(called("production_order_overview.eq")).toContainEqual([
      "production_order_overview.eq",
      "item_id",
      ID,
    ]);
  });

  test("proveedores de la fábrica ordenados por nombre", async () => {
    db.tables.suppliers = { data: [{ id: "s1", name: "Petroquímica Sur" }] };
    expect(await listSuppliers(ORG)).toEqual([{ id: "s1", name: "Petroquímica Sur" }]);
    expect(called("suppliers.eq")).toContainEqual(["suppliers.eq", "organization_id", ORG]);
  });

  test("si la base falla, lanza el error", async () => {
    db.tables.bom_usage = { data: null, error: { message: "boom" } };
    await expect(listUsedIn(ORG, ID)).rejects.toMatchObject({ message: "boom" });
  });
});
