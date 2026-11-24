vi.mock("server-only", () => ({}));

type Call = [string, ...unknown[]];
const db = vi.hoisted(() => ({
  calls: [] as Call[],
  tables: {} as Record<string, { data: unknown[]; error?: { message: string } | null }>,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq", "is", "order", "limit"]) {
        b[m] = (...args: unknown[]) => {
          db.calls.push([`${table}.${m}`, ...args]);
          return b;
        };
      }
      b.then = (resolve: (v: unknown) => unknown) => {
        const t = db.tables[table] ?? { data: [] };
        return resolve({ data: t.data, error: t.error ?? null });
      };
      return b;
    },
  }),
}));

import { getCosts } from "@/features/costs/queries";

const ORG = "99999999-9999-4999-8999-999999999999";
const called = (name: string) => db.calls.filter((c) => c[0] === name);

const catalog = (over = {}) => ({
  id: "p1",
  name: "Balde 10 L rojo",
  sku: "BAL-10L",
  sale_price: 4200,
  ...over,
});
const costing = (over = {}) => ({
  item_id: "p1",
  materials_cost: 1163.86,
  labor_cost: 86.67,
  overhead_cost: 45,
  standard_cost: 1295.53,
  ...over,
});
const order = (i: number, over = {}) => ({
  id: `o${i}`,
  code: `OP-2026-000${i}`,
  item_name: "Balde 10 L rojo",
  planned_qty: 100,
  planned_material_cost: 100000,
  planned_labor_cost: 20000,
  planned_overhead_cost: 10000,
  actual_unit_cost: 1400,
  completed_at: `2026-06-0${i}T10:00:00Z`,
  ...over,
});

beforeEach(() => {
  db.calls = [];
  db.tables = {};
});

test("arma el costo y el margen de cada producto", async () => {
  db.tables = { item_catalog: { data: [catalog()] }, item_costing: { data: [costing()] } };
  const { products } = await getCosts(ORG);
  expect(products).toHaveLength(1);
  expect(products[0]).toMatchObject({
    itemId: "p1",
    name: "Balde 10 L rojo",
    sku: "BAL-10L",
    materials: 1163.86,
    labor: 86.67,
    overhead: 45,
    standard: 1295.53,
    price: 4200,
  });
  expect(products[0]!.margin).toBeCloseTo(69.16, 1);
});

test("un producto sin receta no inventa costo ni margen", async () => {
  db.tables = {
    item_catalog: { data: [catalog()] },
    item_costing: { data: [costing({ materials_cost: null, standard_cost: null })] },
  };
  const { products } = await getCosts(ORG);
  expect(products[0]).toMatchObject({ materials: null, standard: null, margin: null });
});

test("precio 0 o sin precio: margen nulo, sin dividir por cero", async () => {
  db.tables = {
    item_catalog: {
      data: [catalog({ sale_price: 0 }), catalog({ id: "p2", sale_price: null })],
    },
    item_costing: { data: [costing(), costing({ item_id: "p2" })] },
  };
  const { products } = await getCosts(ORG);
  expect(products.map((p) => p.margin)).toEqual([null, null]);
});

test("un producto del catálogo sin fila de costos queda con valores nulos", async () => {
  db.tables = { item_catalog: { data: [catalog()] }, item_costing: { data: [] } };
  const { products } = await getCosts(ORG);
  expect(products[0]).toMatchObject({ materials: null, labor: null, overhead: null });
});

test("los desvíos son las 8 últimas completadas, con costo unitario planificado y real", async () => {
  db.tables = { production_order_overview: { data: [order(1), order(2)] } };
  const { deviations } = await getCosts(ORG);
  expect(deviations).toEqual([
    {
      id: "o1",
      code: "OP-2026-0001",
      itemName: "Balde 10 L rojo",
      plannedUnit: 1300,
      actualUnit: 1400,
    },
    {
      id: "o2",
      code: "OP-2026-0002",
      itemName: "Balde 10 L rojo",
      plannedUnit: 1300,
      actualUnit: 1400,
    },
  ]);
  expect(called("production_order_overview.eq")).toEqual(
    expect.arrayContaining([
      ["production_order_overview.eq", "status", "completed"],
      ["production_order_overview.eq", "organization_id", ORG],
    ]),
  );
  expect(called("production_order_overview.order")[0]).toEqual([
    "production_order_overview.order",
    "completed_at",
    { ascending: false },
  ]);
  expect(called("production_order_overview.limit")[0]).toEqual([
    "production_order_overview.limit",
    8,
  ]);
});

test("una orden completada sin costo real o sin cantidad se omite", async () => {
  db.tables = {
    production_order_overview: {
      data: [order(1, { actual_unit_cost: null }), order(2, { planned_qty: 0 }), order(3)],
    },
  };
  const { deviations } = await getCosts(ORG);
  expect(deviations.map((d) => d.id)).toEqual(["o3"]);
});

test("todas las consultas van acotadas a la fábrica", async () => {
  await getCosts(ORG);
  for (const t of ["item_catalog", "item_costing", "production_order_overview"]) {
    expect(called(`${t}.eq`)).toContainEqual([`${t}.eq`, "organization_id", ORG]);
  }
});

test("un error de la base se propaga", async () => {
  db.tables = { item_costing: { data: [], error: { message: "boom" } } };
  await expect(getCosts(ORG)).rejects.toMatchObject({ message: "boom" });
});
