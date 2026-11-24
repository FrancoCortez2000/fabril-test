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
vi.mock("@/features/costs/queries", () => ({
  getCosts: async () => ({
    products: [
      {
        itemId: "p1",
        name: "Balde 10 L rojo",
        sku: "BAL-10L",
        materials: 1163.86,
        labor: 86.67,
        overhead: 45,
        standard: 1295.53,
        price: 4200,
        margin: 69.2,
      },
      {
        itemId: "p2",
        name: "Sin receta",
        sku: "SR",
        materials: null,
        labor: null,
        overhead: null,
        standard: null,
        price: null,
        margin: null,
      },
    ],
    deviations: [],
  }),
}));

import { exportCosts, exportInventory, exportProduction } from "@/features/exports/queries";

const ORG = "99999999-9999-4999-8999-999999999999";
const called = (name: string) => db.calls.filter((c) => c[0] === name);

beforeEach(() => {
  db.calls = [];
  db.tables = {};
});

test("inventario: una fila por ítem con tipo, unidad, stock y valor, sin autores", async () => {
  db.tables = {
    item_catalog: {
      data: [
        {
          sku: "PP",
          name: "Polipropileno",
          type: "raw_material",
          category_name: "Resinas",
          unit_code: "kg",
          current_stock: 1200.5,
          committed: 100,
          available: 1100.5,
          cost: 1000,
          stock_value: 1200500,
        },
        {
          sku: "BAL",
          name: "Balde",
          type: "finished_good",
          category_name: null,
          unit_code: "u",
          current_stock: 73,
          committed: 0,
          available: 73,
          cost: null,
          stock_value: 97186.56,
        },
      ],
    },
  };
  const { columns, rows } = await exportInventory(ORG);
  expect(columns).toEqual([
    "SKU",
    "Nombre",
    "Tipo",
    "Categoría",
    "Unidad",
    "Stock",
    "Comprometido",
    "Disponible",
    "Costo",
    "Valor",
  ]);
  expect(rows[0]).toEqual([
    "PP",
    "Polipropileno",
    "Materia prima",
    "Resinas",
    "kg",
    1200.5,
    100,
    1100.5,
    1000,
    1200500,
  ]);
  expect(rows[1]).toEqual(["BAL", "Balde", "Producto", null, "u", 73, 0, 73, null, 97186.56]);
  expect(called("item_catalog.eq")).toContainEqual(["item_catalog.eq", "organization_id", ORG]);
  expect(called("item_catalog.limit")[0]).toEqual(["item_catalog.limit", 5000]);
  for (const [, cols] of called("item_catalog.select")) {
    expect(String(cols)).not.toMatch(/created_by|actor_id/);
  }
});

test("producción: estado y prioridad en español, avance y costos", async () => {
  db.tables = {
    production_order_overview: {
      data: [
        {
          code: "OP-2026-0001",
          item_name: "Balde",
          item_sku: "BAL",
          status: "completed",
          priority: "high",
          planned_qty: 100,
          good_qty: 98,
          defective_qty: 2,
          progress_pct: 98,
          planned_start_date: "2026-06-01",
          planned_end_date: "2026-06-03",
          completed_at: "2026-06-03T10:00:00Z",
          planned_material_cost: 100,
          planned_labor_cost: 20,
          planned_overhead_cost: 10,
          actual_material_cost: 110,
          actual_labor_cost: 22,
          actual_overhead_cost: 9.8,
          actual_unit_cost: 1.4,
        },
      ],
    },
  };
  const { columns, rows } = await exportProduction(ORG);
  expect(columns.slice(0, 4)).toEqual(["Orden", "Producto", "SKU", "Estado"]);
  expect(rows[0]!.slice(0, 7)).toEqual([
    "OP-2026-0001",
    "Balde",
    "BAL",
    "Completada",
    "Alta",
    100,
    98,
  ]);
  expect(rows[0]).toHaveLength(columns.length);
  expect(called("production_order_overview.eq")).toContainEqual([
    "production_order_overview.eq",
    "organization_id",
    ORG,
  ]);
  expect(called("production_order_overview.limit")[0]).toEqual([
    "production_order_overview.limit",
    5000,
  ]);
});

test("costos: lo que no existe queda vacío, no cero", async () => {
  const { columns, rows } = await exportCosts(ORG);
  expect(columns).toEqual([
    "Producto",
    "SKU",
    "Materiales",
    "Mano de obra",
    "Indirectos",
    "Costo estándar",
    "Precio",
    "Margen %",
  ]);
  expect(rows[0]).toEqual(["Balde 10 L rojo", "BAL-10L", 1163.86, 86.67, 45, 1295.53, 4200, 69.2]);
  expect(rows[1]).toEqual(["Sin receta", "SR", null, null, null, null, null, null]);
});

test("un error de la base se propaga", async () => {
  db.tables = { item_catalog: { data: [], error: { message: "boom" } } };
  await expect(exportInventory(ORG)).rejects.toMatchObject({ message: "boom" });
});
