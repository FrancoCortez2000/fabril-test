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
      for (const m of ["select", "eq", "or", "limit"]) {
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

import { searchRecords } from "@/features/search/queries";

const ORG = "99999999-9999-4999-8999-999999999999";
const called = (name: string) => db.calls.filter((c) => c[0] === name);

beforeEach(() => {
  db.calls = [];
  db.tables = {};
});

test("busca en las cuatro fuentes de la fábrica y arma los enlaces", async () => {
  db.tables = {
    item_catalog: {
      data: [
        { id: "p1", type: "product", sku: "BAL-10L", name: "Balde 10 L rojo" },
        { id: "m1", type: "raw_material", sku: "PP", name: "Polipropileno" },
      ],
    },
    production_order_overview: { data: [{ id: "o1", code: "OP-2026-0001", item_name: "Balde" }] },
    purchase_overview: { data: [{ id: "c1", code: "OC-2026-0001", supplier_name: "Sur S.A." }] },
  };
  const hits = await searchRecords(ORG, "balde");
  expect(hits.map((h) => [h.kind, h.href])).toEqual([
    ["product", "/app/productos/p1"],
    ["raw_material", "/app/materias-primas/m1"],
    ["order", "/app/produccion/o1"],
    ["purchase", "/app/compras/c1"],
  ]);
  expect(hits[0]).toMatchObject({ title: "Balde 10 L rojo", detail: "BAL-10L" });
  for (const t of ["item_catalog", "production_order_overview", "purchase_overview"]) {
    expect(called(`${t}.eq`)).toContainEqual([`${t}.eq`, "organization_id", ORG]);
    expect(called(`${t}.limit`)[0]).toEqual([`${t}.limit`, 5]);
  }
});

test("un término de una letra o vacío no consulta", async () => {
  expect(await searchRecords(ORG, "a")).toEqual([]);
  expect(await searchRecords(ORG, "   ")).toEqual([]);
  expect(await searchRecords(ORG, "%,()")).toEqual([]);
  expect(db.calls).toEqual([]);
});

test("los caracteres del filtro no llegan a la consulta", async () => {
  await searchRecords(ORG, 'a,b)(%"\ cd');
  for (const c of called("item_catalog.or")) {
    expect(String(c[1])).not.toMatch(/["*\\]/);
    expect(String(c[1])).toContain("ilike.%a b cd%");
  }
});

test("un error de la base se propaga", async () => {
  db.tables = { purchase_overview: { data: [], error: { message: "boom" } } };
  await expect(searchRecords(ORG, "balde")).rejects.toMatchObject({ message: "boom" });
});
