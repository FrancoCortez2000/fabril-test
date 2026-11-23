import type { TableParams } from "@/components/data-table/params";

vi.mock("server-only", () => ({}));

type Call = [string, ...unknown[]];

const db = vi.hoisted(() => ({
  calls: [] as Call[],
  /** Respuestas por vez que se consulta `item_catalog`. */
  responses: [] as { data: unknown[]; count: number; error?: { message: string } | null }[],
  categories: [] as unknown[],
}));

vi.mock("@/lib/supabase/server", () => {
  function builder(table: string) {
    const b: Record<string, unknown> = {};
    for (const method of ["select", "eq", "in", "is", "or", "order", "range", "ilike"]) {
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
  return { createClient: async () => ({ from: (table: string) => builder(table) }) };
});

import { listCategories, listItems } from "@/features/items/queries";

const params = (over: Partial<TableParams> = {}): TableParams => ({
  page: 1,
  pageSize: 25,
  sort: { id: "name", desc: false },
  q: "",
  filters: {},
  ...over,
});

const CAT = "11111111-1111-4111-8111-111111111111";
const ORG = "99999999-9999-4999-8999-999999999999";
const called = (name: string) => db.calls.filter((c) => c[0] === name);

const RAW = {
  id: "i1",
  sku: "PEAD",
  name: "PEAD",
  description: null,
  type: "raw_material",
  category_id: CAT,
  category_name: "Resinas",
  unit_code: "kg",
  min_stock: 500,
  current_stock: 300,
  avg_cost: 1000,
  sale_price: null,
  standard_cost: null,
  cost: 1000,
  status: "active",
  archived_at: null,
  level: "low",
};

beforeEach(() => {
  db.calls = [];
  db.responses = [{ data: [RAW], count: 1 }];
  db.categories = [];
});

describe("listItems", () => {
  test("sólo trae los ítems de la fábrica activa (el usuario puede tener varias)", async () => {
    await listItems(ORG, "raw_material", params());
    expect(called("item_catalog.eq")).toContainEqual(["item_catalog.eq", "organization_id", ORG]);
  });

  test("filtra por tipo y oculta los archivados por defecto", async () => {
    await listItems(ORG, "raw_material", params());
    expect(called("item_catalog.eq")).toContainEqual(["item_catalog.eq", "type", "raw_material"]);
    expect(called("item_catalog.is")).toContainEqual(["item_catalog.is", "archived_at", null]);
  });

  test("mapea la fila al formato de la tabla", async () => {
    const { rows, total } = await listItems(ORG, "raw_material", params());
    expect(total).toBe(1);
    expect(rows).toEqual([
      {
        id: "i1",
        sku: "PEAD",
        name: "PEAD",
        description: "",
        category: { id: CAT, name: "Resinas" },
        unitCode: "kg",
        currentStock: 300,
        minStock: 500,
        avgCost: 1000,
        standardCost: null,
        cost: 1000,
        salePrice: null,
        status: "active",
        archived: false,
        level: "low",
      },
    ]);
  });

  test("la búsqueda usa sólo el texto sanitizado", async () => {
    await listItems(ORG, "finished_good", params({ q: "balde,(10)*" }));
    const [[, expression]] = called("item_catalog.or") as [[string, string]];
    expect(expression).toBe("sku.ilike.%balde 10%,name.ilike.%balde 10%");
  });

  test("una búsqueda que queda vacía no agrega filtro", async () => {
    await listItems(ORG, "finished_good", params({ q: ",*()" }));
    expect(called("item_catalog.or")).toEqual([]);
  });

  test("traduce el nivel de stock y la categoría; descarta valores inválidos", async () => {
    await listItems(
      ORG,
      "raw_material",
      params({ filters: { stock: ["low", "hack", "out"], categoria: [CAT, "no-es-uuid"] } }),
    );
    expect(called("item_catalog.in")).toEqual(
      expect.arrayContaining([
        ["item_catalog.in", "level", ["low", "out"]],
        ["item_catalog.in", "category_id", [CAT]],
      ]),
    );
  });

  test("filtros de estado: activo, inactivo y archivado", async () => {
    await listItems(ORG, "raw_material", params({ filters: { estado: ["archived"] } }));
    expect(called("item_catalog.or")[0]?.[1]).toBe("archived_at.not.is.null");
    db.calls = [];
    db.responses = [{ data: [], count: 0 }];
    await listItems(ORG, "raw_material", params({ filters: { estado: ["active", "inactive"] } }));
    expect(called("item_catalog.or")[0]?.[1]).toBe(
      "and(status.eq.active,archived_at.is.null),and(status.eq.inactive,archived_at.is.null)",
    );
  });

  test.each([
    ["name", false, "name"],
    ["sku", true, "sku"],
    ["stock", false, "current_stock"],
    ["cost", true, "cost"],
    ["price", false, "sale_price"],
  ])(
    "ordena por %s (desc=%s) sobre la columna %s con desempate por id",
    async (id, desc, column) => {
      await listItems(ORG, "raw_material", params({ sort: { id, desc } }));
      const orders = called("item_catalog.order");
      expect(orders[0]?.[1]).toBe(column);
      expect(orders[0]?.[2]).toMatchObject({ ascending: !desc });
      expect(orders[1]?.[1]).toBe("id");
    },
  );

  test("una clave de orden desconocida cae en el nombre", async () => {
    await listItems(ORG, "raw_material", params({ sort: { id: "hack; drop", desc: false } }));
    expect(called("item_catalog.order")[0]?.[1]).toBe("name");
  });

  test("pagina con rango", async () => {
    await listItems(ORG, "raw_material", params({ page: 3, pageSize: 10 }));
    expect(called("item_catalog.range")).toContainEqual(["item_catalog.range", 20, 29]);
  });

  test("si la página pedida queda más allá del final, devuelve la última", async () => {
    db.responses = [
      { data: [], count: 12 },
      { data: [RAW], count: 12 },
    ];
    const { rows, total } = await listItems(ORG, "raw_material", params({ page: 9, pageSize: 10 }));
    expect(total).toBe(12);
    expect(rows).toHaveLength(1);
    expect(called("item_catalog.range").at(-1)).toEqual(["item_catalog.range", 10, 19]);
  });

  test("si la base falla, lanza el error", async () => {
    db.responses = [{ data: [], count: 0, error: { message: "boom" } }];
    await expect(listItems(ORG, "raw_material", params())).rejects.toMatchObject({
      message: "boom",
    });
  });
});

describe("listCategories", () => {
  test("devuelve las categorías aplicables al tipo, ordenadas por nombre", async () => {
    db.categories = [
      { id: CAT, name: "Resinas" },
      { id: "c2", name: "Aditivos" },
    ];
    const cats = await listCategories(ORG, "raw_material");
    expect(cats).toEqual([
      { id: CAT, name: "Resinas" },
      { id: "c2", name: "Aditivos" },
    ]);
    expect(called("categories.eq")).toContainEqual(["categories.eq", "organization_id", ORG]);
    expect(called("categories.in")).toContainEqual([
      "categories.in",
      "applies_to",
      ["raw_material", "both"],
    ]);
    expect(called("categories.order")[0]?.[1]).toBe("name");
  });
});
