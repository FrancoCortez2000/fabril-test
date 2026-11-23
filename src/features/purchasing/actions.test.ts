vi.mock("server-only", () => ({}));

type Call = [string, ...unknown[]];

const state = vi.hoisted(() => ({
  session: null as unknown,
  calls: [] as Call[],
  purchase: { id: "po", status: "pending" } as { id: string; status: string } | null,
  lines: [] as { id: string; unit_code: string }[],
  rpc: { data: { id: "ok" } as unknown, error: null as null | { code?: string; message: string } },
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
    function builder(table: string) {
      const b: Record<string, unknown> = {};
      for (const method of ["select", "eq", "in"]) {
        b[method] = (...args: unknown[]) => {
          state.calls.push([`${table}.${method}`, ...args]);
          return b;
        };
      }
      b.maybeSingle = async () => ({ data: state.purchase, error: null });
      b.then = (resolve: (v: unknown) => unknown) => resolve({ data: state.lines, error: null });
      return b;
    }
    return {
      from: (t: string) => builder(t),
      rpc: async (name: string, args: unknown) => {
        state.calls.push([`rpc.${name}`, args]);
        return state.rpc;
      },
    };
  },
}));

import { cancelPurchase, confirmPurchase, receivePurchase } from "@/features/purchasing/actions";
import { demoSession } from "@/lib/auth/demo";
import type { AppSession } from "@/lib/auth/types";

const ORG = "99999999-9999-4999-8999-999999999999";
const PO = "11111111-1111-4111-8111-111111111111";
const LINE = "22222222-2222-4222-8222-222222222222";
const OTHER_LINE = "44444444-4444-4444-8444-444444444444";

const admin: AppSession = {
  user: { id: "u1", name: "Ana", email: "a@a.com" },
  organizations: [{ id: ORG, name: "Fábrica", isDemo: false, role: "admin" }],
  activeOrganizationId: ORG,
  role: "admin",
  mode: "member",
};

const called = (name: string) => state.calls.filter((c) => c[0] === name);

beforeEach(() => {
  state.calls = [];
  state.session = admin;
  state.purchase = { id: PO, status: "pending" };
  state.lines = [{ id: LINE, unit_code: "kg" }];
  state.rpc = { data: { id: "ok" }, error: null };
});

describe.each([
  ["confirmPurchase", () => confirmPurchase({ id: PO })],
  [
    "receivePurchase",
    () =>
      receivePurchase({
        id: PO,
        deliveryNote: "",
        receivedAt: "2026-10-01",
        lines: [{ lineId: LINE, quantity: 5 }],
      }),
  ],
  ["cancelPurchase", () => cancelPurchase({ id: PO, reason: "Cambio de proveedor" })],
])("%s", (_name, run) => {
  test("en la demo no hace nada", async () => {
    state.session = demoSession({ id: ORG, name: "Demo" });
    expect(await run()).toEqual({ ok: false, error: "No disponible en la demo" });
    expect(state.calls.filter((c) => String(c[0]).startsWith("rpc."))).toEqual([]);
  });

  test("sin rol no tiene permiso", async () => {
    state.session = { ...admin, role: null };
    expect((await run()).ok).toBe(false);
    expect(state.calls.filter((c) => String(c[0]).startsWith("rpc."))).toEqual([]);
  });

  test("la orden tiene que ser de la fábrica activa", async () => {
    state.purchase = null;
    expect(await run()).toEqual({
      ok: false,
      error: "No encontramos esa orden de compra en esta fábrica",
    });
    expect(called("purchase_overview.eq")).toEqual(
      expect.arrayContaining([
        ["purchase_overview.eq", "id", PO],
        ["purchase_overview.eq", "organization_id", ORG],
      ]),
    );
    expect(state.calls.filter((c) => String(c[0]).startsWith("rpc."))).toEqual([]);
  });

  test("el aviso 'ya no está…' de la base llega tal cual (doble envío)", async () => {
    state.rpc = {
      data: null,
      error: { code: "P0001", message: "La orden OC-2026-0001 ya no está en borrador" },
    };
    expect(await run()).toEqual({
      ok: false,
      error: "La orden OC-2026-0001 ya no está en borrador",
    });
  });
});

describe("llamadas a las RPC", () => {
  test("confirmar", async () => {
    expect((await confirmPurchase({ id: PO })).ok).toBe(true);
    expect(called("rpc.confirm_purchase_order")[0]).toEqual([
      "rpc.confirm_purchase_order",
      { p_id: PO },
    ]);
    expect(called("revalidate").length).toBeGreaterThan(0);
  });

  test("recibir manda las líneas con line_id y el remito vacío como nulo", async () => {
    await receivePurchase({
      id: PO,
      deliveryNote: "",
      receivedAt: "2026-10-01",
      lines: [{ lineId: LINE, quantity: 5.5 }],
    });
    expect(called("rpc.receive_purchase_order")[0]).toEqual([
      "rpc.receive_purchase_order",
      {
        p_id: PO,
        p_delivery_note: null,
        p_received_at: "2026-10-01",
        p_lines: [{ line_id: LINE, quantity: 5.5 }],
      },
    ]);
  });

  test("recibir con remito", async () => {
    await receivePurchase({
      id: PO,
      deliveryNote: "0001-00004567",
      receivedAt: "2026-10-01",
      lines: [{ lineId: LINE, quantity: 1 }],
    });
    expect(called("rpc.receive_purchase_order")[0]?.[1]).toMatchObject({
      p_delivery_note: "0001-00004567",
    });
  });

  test("cancelar", async () => {
    await cancelPurchase({ id: PO, reason: "Cambio de proveedor" });
    expect(called("rpc.cancel_purchase_order")[0]).toEqual([
      "rpc.cancel_purchase_order",
      { p_id: PO, p_reason: "Cambio de proveedor" },
    ]);
  });
});

describe("recepción: validaciones previas", () => {
  test("una línea que no es de la orden se rechaza", async () => {
    const result = await receivePurchase({
      id: PO,
      deliveryNote: "",
      receivedAt: "2026-10-01",
      lines: [{ lineId: OTHER_LINE, quantity: 1 }],
    });
    expect(result).toEqual({ ok: false, error: "Una de las líneas no pertenece a esta orden" });
    expect(called("rpc.receive_purchase_order")).toEqual([]);
  });

  test("una unidad entera no admite decimales", async () => {
    state.lines = [{ id: LINE, unit_code: "u" }];
    const result = await receivePurchase({
      id: PO,
      deliveryNote: "",
      receivedAt: "2026-10-01",
      lines: [{ lineId: LINE, quantity: 2.5 }],
    });
    expect(result).toEqual({ ok: false, error: "Esta unidad no admite decimales" });
    expect(called("rpc.receive_purchase_order")).toEqual([]);
  });

  test("más que lo pendiente lo rechaza la base y el mensaje llega legible", async () => {
    state.rpc = {
      data: null,
      error: { code: "P0001", message: "No se puede recibir más de lo pendiente en PEAD" },
    };
    expect(
      await receivePurchase({
        id: PO,
        deliveryNote: "",
        receivedAt: "2026-10-01",
        lines: [{ lineId: LINE, quantity: 999 }],
      }),
    ).toEqual({ ok: false, error: "No se puede recibir más de lo pendiente en PEAD" });
  });
});
