vi.mock("server-only", () => ({}));

type Call = [string, ...unknown[]];

const state = vi.hoisted(() => ({
  session: null as unknown,
  calls: [] as Call[],
  /** Resultado de la próxima operación de escritura sobre `items`. */
  result: {
    data: [{ id: "item-1" }] as unknown,
    error: null as null | { code?: string; message: string },
  },
}));

vi.mock("next/navigation", () => ({
  unstable_rethrow: () => undefined,
  redirect: () => undefined,
}));
vi.mock("next/cache", () => ({
  revalidatePath: (...a: unknown[]) => state.calls.push(["revalidate", ...a]),
}));
vi.mock("@/lib/auth/session", () => ({ requireSession: async () => state.session }));
vi.mock("@/lib/supabase/server", () => {
  function builder(table: string) {
    const b: Record<string, unknown> = {};
    for (const method of ["insert", "update", "select", "eq", "single"]) {
      b[method] = (...args: unknown[]) => {
        state.calls.push([`${table}.${method}`, ...args]);
        return b;
      };
    }
    b.then = (resolve: (v: unknown) => unknown) =>
      resolve(
        table === "units"
          ? { data: [{ id: 3 }], error: null }
          : table === "items"
            ? { data: state.result.data, error: state.result.error }
            : { data: null, error: null },
      );
    return b;
  }
  return { createClient: async () => ({ from: (t: string) => builder(t) }) };
});

import { demoSession } from "@/lib/auth/demo";
import type { AppSession } from "@/lib/auth/types";
import { saveItem, setItemArchived } from "@/features/items/actions";

const ORG = "99999999-9999-4999-8999-999999999999";
const ID = "11111111-1111-4111-8111-111111111111";
const admin: AppSession = {
  user: { id: "u1", name: "Ana", email: "a@a.com" },
  organizations: [{ id: ORG, name: "Fábrica", isDemo: false, role: "admin" }],
  activeOrganizationId: ORG,
  role: "admin",
  mode: "member",
};

const input = {
  kind: "finished_good",
  name: "Bidón 5 L azul",
  sku: "bid-5l-az",
  description: "",
  categoryId: null,
  unitCode: "u",
  minStock: 500,
  status: "active",
  salePrice: 2850,
  standardLaborMinutes: 15,
  overheadPerUnit: 20,
  preferredSupplierId: null,
};

const called = (name: string) => state.calls.filter((c) => c[0] === name);

beforeEach(() => {
  state.calls = [];
  state.session = admin;
  state.result = { data: [{ id: "item-1" }], error: null };
});

describe("saveItem", () => {
  test("en la demo no hace nada", async () => {
    state.session = demoSession({ id: ORG, name: "Demo" });
    expect(await saveItem(input)).toEqual({ ok: false, error: "No disponible en la demo" });
    expect(called("items.insert")).toEqual([]);
  });

  test("sin rol no tiene permiso", async () => {
    state.session = { ...admin, role: null };
    expect(await saveItem(input)).toEqual({
      ok: false,
      error: "No tenés permiso para hacer esto en esta fábrica",
    });
  });

  test("valida con el esquema antes de tocar la base", async () => {
    const result = await saveItem({ ...input, minStock: -1 });
    expect(result.ok).toBe(false);
    expect(called("items.insert")).toEqual([]);
  });

  test("crea el ítem en la fábrica activa, con el tipo y la unidad", async () => {
    const result = await saveItem(input);
    expect(result).toEqual({ ok: true, data: { id: "item-1" } });
    const [[, row]] = called("items.insert") as [[string, Record<string, unknown>]];
    expect(row).toMatchObject({
      organization_id: ORG,
      type: "finished_good",
      sku: "BID-5L-AZ",
      name: "Bidón 5 L azul",
      unit_id: 3,
      min_stock: 500,
      sale_price: 2850,
    });
    expect(Object.keys(row)).not.toContain("manual_cost");
    expect(called("revalidate").length).toBeGreaterThan(0);
  });

  test("al editar actualiza por id y fábrica, sin tocar el tipo", async () => {
    await saveItem({ ...input, id: ID });
    const [[, row]] = called("items.update") as [[string, Record<string, unknown>]];
    expect(Object.keys(row)).not.toContain("type");
    expect(Object.keys(row)).not.toContain("organization_id");
    expect(called("items.eq")).toEqual(
      expect.arrayContaining([
        ["items.eq", "id", ID],
        ["items.eq", "organization_id", ORG],
      ]),
    );
  });

  test("editar un ítem que no existe en la fábrica avisa", async () => {
    state.result = { data: [], error: null };
    expect(await saveItem({ ...input, id: ID })).toEqual({
      ok: false,
      error: "No encontramos ese ítem en esta fábrica",
    });
  });

  test("el SKU repetido se explica", async () => {
    state.result = { data: null, error: { code: "23505", message: "dup" } };
    expect(await saveItem(input)).toEqual({
      ok: false,
      error: "Ya existe un registro con ese dato (por ejemplo, el mismo SKU)",
    });
  });

  test("el aviso de la base por cambiar la unidad llega tal cual", async () => {
    state.result = {
      data: null,
      error: { code: "P0001", message: "No se puede cambiar la unidad de un ítem con movimientos" },
    };
    expect(await saveItem({ ...input, id: ID })).toEqual({
      ok: false,
      error: "No se puede cambiar la unidad de un ítem con movimientos",
    });
  });
});

describe("setItemArchived", () => {
  test("archiva con la fecha actual y reactiva con null", async () => {
    await setItemArchived({ id: ID, archived: true });
    const [[, archived]] = called("items.update") as [[string, { archived_at: string | null }]];
    expect(typeof archived.archived_at).toBe("string");
    state.calls = [];
    await setItemArchived({ id: ID, archived: false });
    const [[, restored]] = called("items.update") as [[string, { archived_at: string | null }]];
    expect(restored.archived_at).toBeNull();
  });

  test("filtra por id y fábrica y rechaza la demo", async () => {
    await setItemArchived({ id: ID, archived: true });
    expect(called("items.eq")).toEqual(
      expect.arrayContaining([
        ["items.eq", "id", ID],
        ["items.eq", "organization_id", ORG],
      ]),
    );
    state.session = demoSession({ id: ORG, name: "Demo" });
    expect(await setItemArchived({ id: ID, archived: true })).toEqual({
      ok: false,
      error: "No disponible en la demo",
    });
  });
});
