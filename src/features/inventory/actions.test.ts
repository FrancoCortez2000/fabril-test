vi.mock("server-only", () => ({}));

type Call = [string, ...unknown[]];

const state = vi.hoisted(() => ({
  session: null as unknown,
  calls: [] as Call[],
  item: { unit_code: "kg" } as { unit_code: string } | null,
  rpc: { data: { id: "m1" } as unknown, error: null as null | { code?: string; message: string } },
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
  createClient: async () => {
    const b: Record<string, unknown> = {};
    for (const method of ["select", "eq"]) {
      b[method] = (...args: unknown[]) => {
        state.calls.push([`item_catalog.${method}`, ...args]);
        return b;
      };
    }
    b.maybeSingle = async () => ({ data: state.item, error: null });
    return {
      from: () => b,
      rpc: async (name: string, args: unknown) => {
        state.calls.push([`rpc.${name}`, args]);
        return state.rpc;
      },
    };
  },
}));

import { registerAdjustment, registerMovement } from "@/features/inventory/actions";
import { demoSession } from "@/lib/auth/demo";
import type { AppSession } from "@/lib/auth/types";

const ORG = "99999999-9999-4999-8999-999999999999";
const ITEM = "11111111-1111-4111-8111-111111111111";

const admin: AppSession = {
  user: { id: "u1", name: "Ana", email: "a@a.com" },
  organizations: [{ id: ORG, name: "Fábrica", isDemo: false, role: "admin" }],
  activeOrganizationId: ORG,
  role: "admin",
  mode: "member",
};

const entry = {
  itemId: ITEM,
  type: "manual_in",
  quantity: 10,
  unitCost: 50,
  reason: "Conteo físico",
};
const exit = { itemId: ITEM, type: "manual_out", quantity: 4, unitCost: null, reason: "Rotura" };
const adjust = { itemId: ITEM, countedQty: 42, reason: "Conteo de fin de mes" };

const called = (name: string) => state.calls.filter((c) => c[0] === name);

beforeEach(() => {
  state.calls = [];
  state.session = admin;
  state.item = { unit_code: "kg" };
  state.rpc = { data: { id: "m1" }, error: null };
});

describe("registerMovement", () => {
  test("en la demo no hace nada", async () => {
    state.session = demoSession({ id: ORG, name: "Demo" });
    expect(await registerMovement(entry)).toEqual({ ok: false, error: "No disponible en la demo" });
    expect(called("rpc.create_manual_movement")).toEqual([]);
  });

  test("sin rol no tiene permiso", async () => {
    state.session = { ...admin, role: null };
    expect((await registerMovement(entry)).ok).toBe(false);
    expect(called("rpc.create_manual_movement")).toEqual([]);
  });

  test("valida antes de tocar la base", async () => {
    const result = await registerMovement({ ...entry, reason: "" });
    expect(result.ok).toBe(false);
    expect(called("rpc.create_manual_movement")).toEqual([]);
  });

  test("el ítem tiene que ser de la fábrica activa", async () => {
    state.item = null;
    expect(await registerMovement(entry)).toEqual({
      ok: false,
      error: "No encontramos ese ítem en esta fábrica",
    });
    expect(called("item_catalog.eq")).toEqual(
      expect.arrayContaining([
        ["item_catalog.eq", "id", ITEM],
        ["item_catalog.eq", "organization_id", ORG],
      ]),
    );
    expect(called("rpc.create_manual_movement")).toEqual([]);
  });

  test("una entrada llama a la RPC con el costo", async () => {
    expect(await registerMovement(entry)).toEqual({ ok: true, data: { id: "m1" } });
    expect(called("rpc.create_manual_movement")[0]).toEqual([
      "rpc.create_manual_movement",
      {
        p_item: ITEM,
        p_type: "manual_in",
        p_quantity: 10,
        p_reason: "Conteo físico",
        p_unit_cost: 50,
      },
    ]);
    expect(called("revalidate").length).toBeGreaterThan(0);
  });

  test("una salida va con p_unit_cost nulo", async () => {
    await registerMovement(exit);
    expect(called("rpc.create_manual_movement")[0]?.[1]).toMatchObject({
      p_type: "manual_out",
      p_quantity: 4,
      p_unit_cost: null,
    });
  });

  test("una unidad sin decimales no acepta fracciones", async () => {
    state.item = { unit_code: "u" };
    expect(await registerMovement({ ...entry, quantity: 1.5 })).toEqual({
      ok: false,
      error: "Esta unidad no admite decimales",
    });
    expect(called("rpc.create_manual_movement")).toEqual([]);
    expect((await registerMovement({ ...entry, quantity: 2 })).ok).toBe(true);
  });

  test("el aviso de stock insuficiente de la base llega tal cual", async () => {
    state.rpc = {
      data: null,
      error: { code: "P0001", message: "No hay stock suficiente de PEAD: faltan 5 kg" },
    };
    expect(await registerMovement(exit)).toEqual({
      ok: false,
      error: "No hay stock suficiente de PEAD: faltan 5 kg",
    });
  });
});

describe("registerAdjustment", () => {
  test("en la demo no hace nada", async () => {
    state.session = demoSession({ id: ORG, name: "Demo" });
    expect(await registerAdjustment(adjust)).toEqual({
      ok: false,
      error: "No disponible en la demo",
    });
  });

  test("llama a la RPC con el conteo y el motivo", async () => {
    expect((await registerAdjustment(adjust)).ok).toBe(true);
    expect(called("rpc.create_stock_adjustment")[0]).toEqual([
      "rpc.create_stock_adjustment",
      { p_item: ITEM, p_counted_qty: 42, p_reason: "Conteo de fin de mes" },
    ]);
  });

  test("el ítem tiene que ser de la fábrica activa y la unidad sin decimales exige enteros", async () => {
    state.item = null;
    expect((await registerAdjustment(adjust)).ok).toBe(false);
    state.item = { unit_code: "u" };
    expect(await registerAdjustment({ ...adjust, countedQty: 3.5 })).toEqual({
      ok: false,
      error: "Esta unidad no admite decimales",
    });
  });
});
