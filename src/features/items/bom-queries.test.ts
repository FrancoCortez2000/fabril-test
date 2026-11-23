vi.mock("server-only", () => ({}));

type Call = [string, ...unknown[]];

const db = vi.hoisted(() => ({
  calls: [] as Call[],
  tables: {} as Record<string, { data: unknown; error?: { message: string } | null }>,
}));

vi.mock("@/lib/supabase/server", () => {
  function builder(table: string) {
    const b: Record<string, unknown> = {};
    for (const method of ["select", "eq", "in", "is", "order", "maybeSingle"]) {
      b[method] = (...args: unknown[]) => {
        db.calls.push([`${table}.${method}`, ...args]);
        return b;
      };
    }
    b.then = (resolve: (v: unknown) => unknown) => {
      const entry = db.tables[table] ?? { data: [] };
      const single = db.calls.some((c) => c[0] === `${table}.maybeSingle`);
      const data = single
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

import { getBom, listBoms, listRawMaterialOptions } from "@/features/items/bom-queries";

const ORG = "99999999-9999-4999-8999-999999999999";
const ITEM = "11111111-1111-4111-8111-111111111111";
const PEAD = "22222222-2222-4222-8222-222222222222";
const MB = "33333333-3333-4333-8333-333333333333";
const called = (name: string) => db.calls.filter((c) => c[0] === name);

beforeEach(() => {
  db.calls = [];
  db.tables = {};
});

describe("getBom", () => {
  test("arma la receta con cada línea, su costo y su disponibilidad, en el orden de la receta", async () => {
    db.tables.boms = {
      data: [{ id: "b1", output_qty: 10, default_waste_pct: null, notes: "v1" }],
    };
    db.tables.organizations = { data: [{ default_waste_pct: 3 }] };
    db.tables.bom_lines = {
      data: [
        { component_item_id: PEAD, quantity: 5, waste_pct: null, position: 0 },
        { component_item_id: MB, quantity: 0.1, waste_pct: 7, position: 1 },
      ],
    };
    db.tables.item_catalog = {
      data: [
        { id: MB, name: "Masterbatch", unit_code: "kg", avg_cost: 8000, available: 2 },
        { id: PEAD, name: "PEAD", unit_code: "kg", avg_cost: 1000, available: 280 },
      ],
    };
    const bom = await getBom(ORG, ITEM);
    expect(bom).toEqual({
      outputQty: 10,
      defaultWastePct: null,
      orgWastePct: 3,
      notes: "v1",
      lines: [
        {
          itemId: PEAD,
          name: "PEAD",
          unitCode: "kg",
          quantity: 5,
          wastePct: null,
          avgCost: 1000,
          available: 280,
        },
        {
          itemId: MB,
          name: "Masterbatch",
          unitCode: "kg",
          quantity: 0.1,
          wastePct: 7,
          avgCost: 8000,
          available: 2,
        },
      ],
    });
    expect(called("boms.eq")).toEqual(
      expect.arrayContaining([
        ["boms.eq", "item_id", ITEM],
        ["boms.eq", "organization_id", ORG],
      ]),
    );
    expect(called("bom_lines.order")[0]?.[1]).toBe("position");
  });

  test("devuelve null si el producto no tiene receta", async () => {
    db.tables.boms = { data: [] };
    expect(await getBom(ORG, ITEM)).toBeNull();
  });

  test("un id inválido no consulta la base", async () => {
    expect(await getBom(ORG, "no-es-uuid")).toBeNull();
    expect(db.calls).toEqual([]);
  });

  test("si la base falla, lanza el error", async () => {
    db.tables.boms = { data: null, error: { message: "boom" } };
    await expect(getBom(ORG, ITEM)).rejects.toMatchObject({ message: "boom" });
  });
});

describe("listRawMaterialOptions", () => {
  test("materias primas activas de la fábrica, por nombre", async () => {
    db.tables.item_catalog = { data: [{ id: PEAD, name: "PEAD", unit_code: "kg" }] };
    expect(await listRawMaterialOptions(ORG)).toEqual([{ id: PEAD, name: "PEAD", unitCode: "kg" }]);
    expect(called("item_catalog.eq")).toEqual(
      expect.arrayContaining([
        ["item_catalog.eq", "organization_id", ORG],
        ["item_catalog.eq", "type", "raw_material"],
        ["item_catalog.eq", "status", "active"],
      ]),
    );
    expect(called("item_catalog.order")[0]?.[1]).toBe("name");
  });
});

describe("listBoms", () => {
  test("recetas de la fábrica por producto, con costo y disponibilidad de cada materia prima", async () => {
    db.tables.boms = {
      data: [
        { id: "b1", item_id: ITEM, output_qty: 10, default_waste_pct: null, notes: null },
        {
          id: "b2",
          item_id: "44444444-4444-4444-8444-444444444444",
          output_qty: 1,
          default_waste_pct: 5,
          notes: "n",
        },
      ],
    };
    db.tables.organizations = { data: [{ default_waste_pct: 3 }] };
    db.tables.bom_lines = {
      data: [
        { bom_id: "b1", component_item_id: PEAD, quantity: 5, waste_pct: null, position: 0 },
        { bom_id: "b2", component_item_id: MB, quantity: 0.1, waste_pct: 7, position: 0 },
      ],
    };
    db.tables.item_catalog = {
      data: [
        { id: PEAD, name: "PEAD", unit_code: "kg", avg_cost: 1000, available: 280 },
        { id: MB, name: "Masterbatch", unit_code: "kg", avg_cost: 8000, available: 2 },
      ],
    };
    const boms = await listBoms(ORG);
    expect(Object.keys(boms).sort()).toEqual([ITEM, "44444444-4444-4444-8444-444444444444"].sort());
    expect(boms[ITEM]).toEqual({
      outputQty: 10,
      defaultWastePct: null,
      orgWastePct: 3,
      notes: null,
      lines: [
        {
          itemId: PEAD,
          name: "PEAD",
          unitCode: "kg",
          quantity: 5,
          wastePct: null,
          avgCost: 1000,
          available: 280,
        },
      ],
    });
    expect(boms["44444444-4444-4444-8444-444444444444"]?.defaultWastePct).toBe(5);
    expect(called("boms.eq")).toContainEqual(["boms.eq", "organization_id", ORG]);
    expect(called("bom_lines.eq")).toContainEqual(["bom_lines.eq", "organization_id", ORG]);
  });

  test("una fábrica sin recetas devuelve un objeto vacío sin consultar líneas", async () => {
    db.tables.boms = { data: [] };
    expect(await listBoms(ORG)).toEqual({});
    expect(called("bom_lines.select")).toEqual([]);
  });

  test("si la base falla, lanza el error", async () => {
    db.tables.boms = { data: null, error: { message: "boom" } };
    await expect(listBoms(ORG)).rejects.toMatchObject({ message: "boom" });
  });
});
