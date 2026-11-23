vi.mock("server-only", () => ({}));

type Call = [string, ...unknown[]];

const state = vi.hoisted(() => ({
  session: null as unknown,
  calls: [] as Call[],
  movement: { id: "m1" } as { id: string } | null,
  rpc: { data: { id: "r1" } as unknown, error: null as null | { code?: string; message: string } },
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
        state.calls.push([`movement_feed.${method}`, ...args]);
        return b;
      };
    }
    b.maybeSingle = async () => ({ data: state.movement, error: null });
    return {
      from: () => b,
      rpc: async (name: string, args: unknown) => {
        state.calls.push([`rpc.${name}`, args]);
        return state.rpc;
      },
    };
  },
}));

import { reverseMovement } from "@/features/inventory/actions";
import { demoSession } from "@/lib/auth/demo";
import type { AppSession } from "@/lib/auth/types";

const ORG = "99999999-9999-4999-8999-999999999999";
const MOVEMENT = "11111111-1111-4111-8111-111111111111";

const admin: AppSession = {
  user: { id: "u1", name: "Ana", email: "a@a.com" },
  organizations: [{ id: ORG, name: "Fábrica", isDemo: false, role: "admin" }],
  activeOrganizationId: ORG,
  role: "admin",
  mode: "member",
};

const input = { movementId: MOVEMENT, reason: "Error de carga" };
const called = (name: string) => state.calls.filter((c) => c[0] === name);

beforeEach(() => {
  state.calls = [];
  state.session = admin;
  state.movement = { id: "m1" };
  state.rpc = { data: { id: "r1" }, error: null };
});

describe("reverseMovement", () => {
  test("en la demo no hace nada", async () => {
    state.session = demoSession({ id: ORG, name: "Demo" });
    expect(await reverseMovement(input)).toEqual({ ok: false, error: "No disponible en la demo" });
    expect(called("rpc.reverse_stock_movement")).toEqual([]);
  });

  test("exige motivo", async () => {
    const result = await reverseMovement({ ...input, reason: "" });
    expect(result.ok).toBe(false);
    expect(called("rpc.reverse_stock_movement")).toEqual([]);
  });

  test("el movimiento tiene que ser de la fábrica activa", async () => {
    state.movement = null;
    expect(await reverseMovement(input)).toEqual({
      ok: false,
      error: "No encontramos ese movimiento en esta fábrica",
    });
    expect(called("movement_feed.eq")).toEqual(
      expect.arrayContaining([
        ["movement_feed.eq", "id", MOVEMENT],
        ["movement_feed.eq", "organization_id", ORG],
      ]),
    );
    expect(called("rpc.reverse_stock_movement")).toEqual([]);
  });

  test("llama a la RPC con el movimiento y el motivo y revalida", async () => {
    expect(await reverseMovement(input)).toEqual({ ok: true, data: { id: "r1" } });
    expect(called("rpc.reverse_stock_movement")[0]).toEqual([
      "rpc.reverse_stock_movement",
      { p_movement: MOVEMENT, p_reason: "Error de carga" },
    ]);
    expect(called("revalidate").length).toBeGreaterThan(0);
  });

  test("el aviso de la base (p. ej. ya revertido) llega tal cual", async () => {
    state.rpc = { data: null, error: { code: "P0001", message: "El movimiento ya fue revertido" } };
    expect(await reverseMovement(input)).toEqual({
      ok: false,
      error: "El movimiento ya fue revertido",
    });
  });
});
