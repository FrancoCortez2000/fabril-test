import type { TableParams } from "@/components/data-table/params";

vi.mock("server-only", () => ({}));

type Call = [string, ...unknown[]];

const db = vi.hoisted(() => ({
  calls: [] as Call[],
  responses: [] as { data: unknown[]; count?: number; error?: { message: string } | null }[],
  categories: [] as unknown[],
}));

vi.mock("@/lib/supabase/server", () => {
  function builder(table: string) {
    const b: Record<string, unknown> = {};
    for (const method of ["select", "eq", "in", "is", "or", "order", "range"]) {
      b[method] = (...args: unknown[]) => {
        db.calls.push([`${table}.${method}`, ...args]);
        return b;
      };
    }
    b.then = (resolve: (v: unknown) => unknown) =>
      resolve(
        table === "categories"
          ? { data: db.categories, error: null }
          : (db.responses.shift() ?? { data: [], count: 0, error: null }),
      );
    return b;
  }
  return { createClient: async () => ({ from: (t: string) => builder(t) }) };
});

import { listAllCategories, listStock } from "@/features/inventory/queries";

const ORG = "99999999-9999-4999-8999-999999999999";
const CAT = "11111111-1111-4111-8111-111111111111";
const called = (name: string) => db.calls.filter((c) => c[0] === name);

const params = (over: Partial<TableParams> = {}): TableParams => ({
  page: 1,
  pageSize: 25,
  sort: { id: "name", desc: false },
  q: "",
  filters: {},
  ...over,
});

const ROW = {
  id: "i1",
  type: "raw_material",
  sku: "PEAD",
  name: "PEAD",
  category_name: "Resinas",
  unit_code: "kg",
  min_stock: 500,
  current_stock: 300,
  committed: 20,
  available: 280,
  avg_cost: 1000,
  stock_value: 300000,
  level: "low",
};

beforeEach(() => {
  db.calls = [];
  db.categories = [];
  db.responses = [
    { data: [ROW], count: 1 },
    {
      data: [
        { level: "low", stock_value: 300000 },
        { level: "out", stock_value: 0 },
        { level: "ok", stock_value: 50000.5 },
        { level: "out", stock_value: 0 },
      ],
    },
  ];
});

describe("listStock", () => {
  test("sólo trae la fábrica activa y oculta los archivados", async () => {
    await listStock(ORG, params());
    expect(called("item_catalog.eq")).toContainEqual(["item_catalog.eq", "organization_id", ORG]);
    expect(called("item_catalog.is")).toContainEqual(["item_catalog.is", "archived_at", null]);
  });

  test("mapea la fila a existencias con su valor", async () => {
    const { rows } = await listStock(ORG, params());
    expect(rows).toEqual([
      {
        itemId: "i1",
        type: "raw_material",
        sku: "PEAD",
        name: "PEAD",
        categoryName: "Resinas",
        unitCode: "kg",
        minStock: 500,
        physical: 300,
        committed: 20,
        available: 280,
        avgCost: 1000,
        value: 300000,
        level: "low",
      },
    ]);
  });

  test("los totales cubren todo el conjunto filtrado, no sólo la página", async () => {
    const { total, totals } = await listStock(ORG, params());
    expect(total).toBe(1);
    expect(totals).toEqual({ value: 350000.5, out: 2, low: 1 });
  });

  test("traduce tipo, categoría y nivel; descarta valores inválidos", async () => {
    await listStock(
      ORG,
      params({
        filters: {
          tipo: ["raw_material", "hack"],
          categoria: [CAT, "no-es-uuid"],
          nivel: ["out", "zzz"],
        },
      }),
    );
    expect(called("item_catalog.in")).toEqual(
      expect.arrayContaining([
        ["item_catalog.in", "type", ["raw_material"]],
        ["item_catalog.in", "category_id", [CAT]],
        ["item_catalog.in", "level", ["out"]],
      ]),
    );
  });

  test("la búsqueda usa sólo el texto sanitizado", async () => {
    await listStock(ORG, params({ q: "pe,ad(*)" }));
    expect(called("item_catalog.or")[0]?.[1]).toBe("sku.ilike.%pe ad%,name.ilike.%pe ad%");
  });

  test.each([
    ["name", "name"],
    ["sku", "sku"],
    ["physical", "current_stock"],
    ["available", "available"],
    ["value", "stock_value"],
    ["inventada", "name"],
  ])("ordena por %s sobre %s con desempate por id", async (id, column) => {
    await listStock(ORG, params({ sort: { id, desc: true } }));
    const orders = called("item_catalog.order");
    expect(orders[0]?.[1]).toBe(column);
    expect(orders[0]?.[2]).toMatchObject({ ascending: false });
    expect(orders[1]?.[1]).toBe("id");
  });

  test("pagina con rango", async () => {
    await listStock(ORG, params({ page: 2, pageSize: 10 }));
    expect(called("item_catalog.range")).toContainEqual(["item_catalog.range", 10, 19]);
  });

  test("sin ítems devuelve totales en cero", async () => {
    db.responses = [{ data: [], count: 0 }, { data: [] }];
    const result = await listStock(ORG, params());
    expect(result).toEqual({ rows: [], total: 0, totals: { value: 0, out: 0, low: 0 } });
  });

  test("una página fuera de rango (PGRST103) vuelve a la primera en lugar de romper", async () => {
    db.responses = [
      { data: [], count: 0, error: { message: "offset", code: "PGRST103" } as never },
      { data: [ROW], count: 1 },
      { data: [] },
    ];
    const { rows } = await listStock(ORG, params({ page: 999 }));
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
      { data: [ROW], count: 60 },
      { data: [ROW], count: 60 },
      { data: [] },
    ];
    await listStock(ORG, params({ page: 999 }));
    expect(called("item_catalog.range").at(-1)).toEqual(["item_catalog.range", 50, 74]);
  });

  test("si la base falla, lanza el error", async () => {
    db.responses = [{ data: [], count: 0, error: { message: "boom" } }];
    await expect(listStock(ORG, params())).rejects.toMatchObject({ message: "boom" });
  });
});

describe("listAllCategories", () => {
  test("categorías de la fábrica por nombre", async () => {
    db.categories = [{ id: CAT, name: "Resinas" }];
    expect(await listAllCategories(ORG)).toEqual([{ id: CAT, name: "Resinas" }]);
    expect(called("categories.eq")).toContainEqual(["categories.eq", "organization_id", ORG]);
    expect(called("categories.order")[0]?.[1]).toBe("name");
  });
});
