vi.mock("server-only", () => ({}));

type Call = [string, ...unknown[]];

const state = vi.hoisted(() => ({
  session: null as unknown,
  calls: [] as Call[],
  rpc: { data: "bom-1" as unknown, error: null as null | { code?: string; message: string } },
}));

vi.mock("next/navigation", () => ({
  unstable_rethrow: () => undefined,
  redirect: () => undefined,
}));
vi.mock("next/cache", () => ({
  revalidatePath: (...a: unknown[]) => state.calls.push(["revalidate", ...a]),
}));
vi.mock("@/lib/auth/session", () => ({ requireSession: async () => state.session }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: async (name: string, args: unknown) => {
      state.calls.push([`rpc.${name}`, args]);
      return state.rpc;
    },
  }),
}));

import { saveBom } from "@/features/items/bom-actions";
import { demoSession } from "@/lib/auth/demo";
import type { AppSession } from "@/lib/auth/types";

const ORG = "99999999-9999-4999-8999-999999999999";
const ITEM = "11111111-1111-4111-8111-111111111111";
const PEAD = "22222222-2222-4222-8222-222222222222";

const admin: AppSession = {
  user: { id: "u1", name: "Ana", email: "a@a.com" },
  organizations: [{ id: ORG, name: "Fábrica", isDemo: false, role: "admin" }],
  activeOrganizationId: ORG,
  role: "admin",
  mode: "member",
};

const input = {
  itemId: ITEM,
  outputQty: 10,
  defaultWastePct: 2,
  notes: "  v2  ",
  lines: [{ componentItemId: PEAD, quantity: 5, wastePct: null }],
};

const called = (name: string) => state.calls.filter((c) => c[0] === name);

beforeEach(() => {
  state.calls = [];
  state.session = admin;
  state.rpc = { data: "bom-1", error: null };
});

describe("saveBom", () => {
  test("en la demo no hace nada", async () => {
    state.session = demoSession({ id: ORG, name: "Demo" });
    expect(await saveBom(input)).toEqual({ ok: false, error: "No disponible en la demo" });
    expect(called("rpc.save_bom")).toEqual([]);
  });

  test("valida la receta antes de llamar a la base", async () => {
    const result = await saveBom({ ...input, lines: [] });
    expect(result.ok).toBe(false);
    expect(called("rpc.save_bom")).toEqual([]);
  });

  test("llama a save_bom con los parámetros exactos", async () => {
    expect(await saveBom(input)).toEqual({ ok: true, data: { id: "bom-1" } });
    expect(called("rpc.save_bom")[0]).toEqual([
      "rpc.save_bom",
      {
        p_item: ITEM,
        p_output_qty: 10,
        p_default_waste_pct: 2,
        p_notes: "v2",
        p_lines: [{ componentItemId: PEAD, quantity: 5, wastePct: null }],
      },
    ]);
    expect(called("revalidate").length).toBeGreaterThan(0);
  });

  test("el aviso de negocio de la base llega tal cual", async () => {
    state.rpc = {
      data: null,
      error: { code: "P0001", message: "La receta tiene que ser de un producto terminado" },
    };
    expect(await saveBom(input)).toEqual({
      ok: false,
      error: "La receta tiene que ser de un producto terminado",
    });
  });

  test("sin permiso en la base se traduce a un mensaje claro", async () => {
    state.rpc = { data: null, error: { code: "42501", message: "denied" } };
    expect(await saveBom(input)).toEqual({
      ok: false,
      error: "No tenés permiso para hacer esto en esta fábrica",
    });
  });
});
