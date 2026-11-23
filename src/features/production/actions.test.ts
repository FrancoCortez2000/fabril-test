vi.mock("server-only", () => ({}));

type Call = [string, ...unknown[]];

const state = vi.hoisted(() => ({
  session: null as unknown,
  calls: [] as Call[],
  item: { id: "item" } as { id: string } | null,
  employee: { id: "emp" } as { id: string } | null,
  rpc: {
    data: { id: "op-1" } as unknown,
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
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    function builder(table: string) {
      const b: Record<string, unknown> = {};
      for (const method of ["select", "eq"]) {
        b[method] = (...args: unknown[]) => {
          state.calls.push([`${table}.${method}`, ...args]);
          return b;
        };
      }
      b.maybeSingle = async () => ({
        data: table === "employees" ? state.employee : state.item,
        error: null,
      });
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

import { createOrder } from "@/features/production/actions";
import { demoSession } from "@/lib/auth/demo";
import type { AppSession } from "@/lib/auth/types";

const ORG = "99999999-9999-4999-8999-999999999999";
const ITEM = "11111111-1111-4111-8111-111111111111";
const EMP = "22222222-2222-4222-8222-222222222222";

const admin: AppSession = {
  user: { id: "u1", name: "Ana", email: "a@a.com" },
  organizations: [{ id: ORG, name: "Fábrica", isDemo: false, role: "admin" }],
  activeOrganizationId: ORG,
  role: "admin",
  mode: "member",
};

const input = {
  itemId: ITEM,
  plannedQty: 100,
  plannedStart: "2026-11-24",
  plannedEnd: "2026-11-30",
  priority: "high",
  responsibleId: EMP,
  notes: "  Para el cliente  ",
};

const called = (name: string) => state.calls.filter((c) => c[0] === name);

beforeEach(() => {
  state.calls = [];
  state.session = admin;
  state.item = { id: ITEM };
  state.employee = { id: EMP };
  state.rpc = { data: { id: "op-1" }, error: null };
});

describe("createOrder", () => {
  test("en la demo no hace nada", async () => {
    state.session = demoSession({ id: ORG, name: "Demo" });
    expect(await createOrder(input)).toEqual({ ok: false, error: "No disponible en la demo" });
    expect(called("rpc.create_production_order")).toEqual([]);
  });

  test("sin rol no tiene permiso", async () => {
    state.session = { ...admin, role: null };
    expect((await createOrder(input)).ok).toBe(false);
    expect(called("rpc.create_production_order")).toEqual([]);
  });

  test("valida antes de tocar la base", async () => {
    expect((await createOrder({ ...input, plannedQty: 0 })).ok).toBe(false);
    expect(called("rpc.create_production_order")).toEqual([]);
  });

  test("el producto tiene que ser de la fábrica activa", async () => {
    state.item = null;
    expect(await createOrder(input)).toEqual({
      ok: false,
      error: "No encontramos ese producto en esta fábrica",
    });
    expect(called("item_catalog.eq")).toEqual(
      expect.arrayContaining([
        ["item_catalog.eq", "id", ITEM],
        ["item_catalog.eq", "organization_id", ORG],
        ["item_catalog.eq", "type", "finished_good"],
      ]),
    );
    expect(called("rpc.create_production_order")).toEqual([]);
  });

  test("el responsable tiene que ser de la fábrica activa", async () => {
    state.employee = null;
    expect(await createOrder(input)).toEqual({
      ok: false,
      error: "No encontramos a ese empleado en esta fábrica",
    });
    expect(called("rpc.create_production_order")).toEqual([]);
  });

  test("llama a la RPC con los parámetros exactos y sin personal extra", async () => {
    expect(await createOrder(input)).toEqual({ ok: true, data: { id: "op-1" } });
    expect(called("rpc.create_production_order")[0]).toEqual([
      "rpc.create_production_order",
      {
        p_item: ITEM,
        p_planned_qty: 100,
        p_planned_start: "2026-11-24",
        p_planned_end: "2026-11-30",
        p_priority: "high",
        p_responsible: EMP,
        p_employee_ids: [],
        p_notes: "Para el cliente",
      },
    ]);
    expect(called("revalidate").length).toBeGreaterThan(0);
  });

  test("sin responsable ni fechas no consulta empleados y manda nulos", async () => {
    await createOrder({
      ...input,
      plannedStart: null,
      plannedEnd: null,
      responsibleId: null,
      notes: "",
    });
    expect(called("employees.eq")).toEqual([]);
    expect(called("rpc.create_production_order")[0]?.[1]).toMatchObject({
      p_planned_start: null,
      p_planned_end: null,
      p_responsible: null,
      p_notes: null,
    });
  });

  test("el aviso de que el producto no tiene receta llega tal cual", async () => {
    state.rpc = {
      data: null,
      error: { code: "P0001", message: "El producto no tiene receta: cargala antes de planificar" },
    };
    expect(await createOrder(input)).toEqual({
      ok: false,
      error: "El producto no tiene receta: cargala antes de planificar",
    });
  });
});
