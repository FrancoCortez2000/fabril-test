vi.mock("server-only", () => ({}));

type Call = [string, ...unknown[]];
type RpcResult = { data: unknown; error: null | { code?: string; message: string } };

const state = vi.hoisted(() => ({
  session: null as unknown,
  calls: [] as Call[],
  order: { id: "op", status: "planned", planned_labor_cost: 12000 } as {
    id: string;
    status: string;
    planned_labor_cost: number;
  } | null,
  team: [] as { employee_id: string; hours_worked: number }[],
  laborRate: 6000,
  supplier: { id: "s" } as { id: string } | null,
  /** Resultado de cada RPC por nombre (por defecto, éxito). */
  rpc: {} as Record<string, { data: unknown; error: null | { code?: string; message: string } }>,
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
        data:
          table === "suppliers"
            ? state.supplier
            : table === "organizations"
              ? { default_labor_rate: state.laborRate }
              : state.order,
        error: null,
      });
      b.then = (resolve: (v: unknown) => unknown) =>
        resolve({ data: table === "production_team" ? state.team : [], error: null });
      return b;
    }
    return {
      from: (t: string) => builder(t),
      rpc: async (name: string, args: unknown): Promise<RpcResult> => {
        state.calls.push([`rpc.${name}`, args]);
        return state.rpc[name] ?? { data: { id: "ok" }, error: null };
      },
    };
  },
}));

import {
  cancelOrder,
  completeOrder,
  createPurchaseFromShortages,
  reportProgress,
  startOrder,
} from "@/features/production/actions";
import { demoSession } from "@/lib/auth/demo";
import type { AppSession } from "@/lib/auth/types";

const ORG = "99999999-9999-4999-8999-999999999999";
const OP = "11111111-1111-4111-8111-111111111111";
const SUP = "22222222-2222-4222-8222-222222222222";

const admin: AppSession = {
  user: { id: "u1", name: "Ana", email: "a@a.com" },
  organizations: [{ id: ORG, name: "Fábrica", isDemo: false, role: "admin" }],
  activeOrganizationId: ORG,
  role: "admin",
  mode: "member",
};

const called = (name: string) => state.calls.filter((c) => c[0] === name);
const rpcCalls = () => state.calls.filter((c) => String(c[0]).startsWith("rpc.")).map((c) => c[0]);

beforeEach(() => {
  state.calls = [];
  state.session = admin;
  state.order = { id: OP, status: "planned", planned_labor_cost: 12000 };
  state.team = [];
  state.laborRate = 6000;
  state.supplier = { id: SUP };
  state.rpc = {};
});

describe.each([
  ["startOrder", () => startOrder({ id: OP })],
  ["reportProgress", () => reportProgress({ id: OP, good: 10, defective: 0, notes: "" })],
  ["completeOrder", () => completeOrder({ id: OP, good: 90, defective: 2, note: "" })],
  ["cancelOrder", () => cancelOrder({ id: OP, reason: "Falta de materia prima" })],
  [
    "createPurchaseFromShortages",
    () => createPurchaseFromShortages({ orderId: OP, supplierId: SUP }),
  ],
])("%s", (_name, run) => {
  test("en la demo no hace nada", async () => {
    state.session = demoSession({ id: ORG, name: "Demo" });
    expect(await run()).toEqual({ ok: false, error: "No disponible en la demo" });
    expect(rpcCalls()).toEqual([]);
  });

  test("sin rol no tiene permiso", async () => {
    state.session = { ...admin, role: null };
    expect((await run()).ok).toBe(false);
    expect(rpcCalls()).toEqual([]);
  });

  test("la orden tiene que ser de la fábrica activa", async () => {
    state.order = null;
    expect(await run()).toEqual({
      ok: false,
      error: "No encontramos esa orden de producción en esta fábrica",
    });
    expect(called("production_order_overview.eq")).toEqual(
      expect.arrayContaining([
        ["production_order_overview.eq", "id", OP],
        ["production_order_overview.eq", "organization_id", ORG],
      ]),
    );
    expect(rpcCalls()).toEqual([]);
  });
});

describe("startOrder", () => {
  test("llama a start_production_order y revalida", async () => {
    expect(await startOrder({ id: OP })).toEqual({ ok: true, data: null });
    expect(called("rpc.start_production_order")[0]).toEqual([
      "rpc.start_production_order",
      { p_id: OP },
    ]);
    expect(called("revalidate").length).toBeGreaterThan(0);
  });

  test("'ya no está planificada' llega legible (doble envío)", async () => {
    state.rpc.start_production_order = {
      data: null,
      error: { code: "P0001", message: "La orden OP-2026-0001 ya no está planificada" },
    };
    expect(await startOrder({ id: OP })).toEqual({
      ok: false,
      error: "La orden OP-2026-0001 ya no está planificada",
    });
  });

  test("la falta de stock se explica con los materiales", async () => {
    state.rpc.start_production_order = {
      data: null,
      error: { code: "P0001", message: "No hay stock suficiente para iniciar: PEAD faltan 5 kg" },
    };
    const result = await startOrder({ id: OP });
    expect(result).toEqual({
      ok: false,
      error: "No hay stock suficiente para iniciar: PEAD faltan 5 kg",
    });
  });
});

describe("reportProgress", () => {
  test("manda las unidades y las notas sin empleado ni fecha", async () => {
    await reportProgress({ id: OP, good: 40, defective: 2, notes: "Primer turno" });
    expect(called("rpc.report_production_progress")[0]).toEqual([
      "rpc.report_production_progress",
      {
        p_id: OP,
        p_good: 40,
        p_defective: 2,
        p_employee: null,
        p_report_date: null,
        p_notes: "Primer turno",
      },
    ]);
  });

  test("exige al menos una unidad buena o defectuosa", async () => {
    expect((await reportProgress({ id: OP, good: 0, defective: 0, notes: "" })).ok).toBe(false);
    expect((await reportProgress({ id: OP, good: -1, defective: 0, notes: "" })).ok).toBe(false);
    expect(rpcCalls()).toEqual([]);
  });
});

describe("completeOrder", () => {
  test("desde 'en producción' pasa por control de calidad y completa, en ese orden", async () => {
    state.order = { id: OP, status: "in_progress", planned_labor_cost: 12000 };
    expect(await completeOrder({ id: OP, good: 90, defective: 2, note: "Todo bien" })).toEqual({
      ok: true,
      data: null,
    });
    expect(rpcCalls()).toEqual(["rpc.send_to_quality_check", "rpc.complete_production_order"]);
    expect(called("rpc.complete_production_order")[0]).toEqual([
      "rpc.complete_production_order",
      {
        p_id: OP,
        p_good: 90,
        p_defective: 2,
        p_consumptions: [],
        p_hours: [],
        p_note: "Todo bien",
      },
    ]);
  });

  test("desde control de calidad sólo completa", async () => {
    state.order = { id: OP, status: "quality_check", planned_labor_cost: 12000 };
    await completeOrder({ id: OP, good: 90, defective: 0, note: "" });
    expect(rpcCalls()).toEqual(["rpc.complete_production_order"]);
    expect(called("rpc.complete_production_order")[0]?.[1]).toMatchObject({ p_note: null });
  });

  test("sin horas cargadas reparte las horas planificadas entre el personal asignado", async () => {
    state.order = { id: OP, status: "quality_check", planned_labor_cost: 12000 };
    state.team = [
      { employee_id: "e1", hours_worked: 0 },
      { employee_id: "e2", hours_worked: 0 },
    ];
    await completeOrder({ id: OP, good: 90, defective: 0, note: "" });
    // 12.000 de mano de obra planificada a $6.000 la hora = 2 horas, repartidas entre 2 personas
    expect(called("rpc.complete_production_order")[0]?.[1]).toMatchObject({
      p_hours: [
        { employee_id: "e1", hours: 1 },
        { employee_id: "e2", hours: 1 },
      ],
    });
  });

  test("sólo reparte entre quienes no tienen horas; si todos tienen, no manda horas", async () => {
    state.order = { id: OP, status: "quality_check", planned_labor_cost: 12000 };
    state.team = [
      { employee_id: "e1", hours_worked: 5 },
      { employee_id: "e2", hours_worked: 0 },
    ];
    await completeOrder({ id: OP, good: 90, defective: 0, note: "" });
    expect(called("rpc.complete_production_order")[0]?.[1]).toMatchObject({
      p_hours: [{ employee_id: "e2", hours: 2 }],
    });
    state.calls = [];
    state.team = [{ employee_id: "e1", hours_worked: 5 }];
    await completeOrder({ id: OP, good: 90, defective: 0, note: "" });
    expect(called("rpc.complete_production_order")[0]?.[1]).toMatchObject({ p_hours: [] });
  });

  test("sin personal asignado o sin costo hora no manda horas", async () => {
    state.order = { id: OP, status: "quality_check", planned_labor_cost: 12000 };
    await completeOrder({ id: OP, good: 90, defective: 0, note: "" });
    expect(called("rpc.complete_production_order")[0]?.[1]).toMatchObject({ p_hours: [] });
    state.calls = [];
    state.team = [{ employee_id: "e1", hours_worked: 0 }];
    state.laborRate = 0;
    await completeOrder({ id: OP, good: 90, defective: 0, note: "" });
    expect(called("rpc.complete_production_order")[0]?.[1]).toMatchObject({ p_hours: [] });
  });

  test("si falla el control de calidad no intenta completar", async () => {
    state.order = { id: OP, status: "in_progress", planned_labor_cost: 12000 };
    state.rpc.send_to_quality_check = {
      data: null,
      error: { code: "P0001", message: "La orden OP-2026-0001 no está en producción" },
    };
    expect(await completeOrder({ id: OP, good: 90, defective: 0, note: "" })).toEqual({
      ok: false,
      error: "La orden OP-2026-0001 no está en producción",
    });
    expect(rpcCalls()).toEqual(["rpc.send_to_quality_check"]);
  });

  test("si falla el segundo paso, avisa que la orden quedó en control de calidad", async () => {
    state.order = { id: OP, status: "in_progress", planned_labor_cost: 12000 };
    state.rpc.complete_production_order = {
      data: null,
      error: {
        code: "P0001",
        message: "Indicá las cantidades finales de unidades buenas y defectuosas",
      },
    };
    const result = await completeOrder({ id: OP, good: 90, defective: 0, note: "" });
    expect(result.ok).toBe(false);
    // la orden ya cambió de estado (control de calidad): la ficha tiene que refrescarse
    expect(called("revalidate").length).toBeGreaterThan(0);
    if (!result.ok) {
      expect(result.error).toContain("Indicá las cantidades finales");
      expect(result.error).toContain("control de calidad");
    }
  });

  test("las cantidades no pueden ser negativas", async () => {
    expect((await completeOrder({ id: OP, good: -1, defective: 0, note: "" })).ok).toBe(false);
    expect(rpcCalls()).toEqual([]);
  });
});

describe("cancelOrder", () => {
  test("manda el motivo y sin devoluciones", async () => {
    await cancelOrder({ id: OP, reason: "Falta de materia prima" });
    expect(called("rpc.cancel_production_order")[0]).toEqual([
      "rpc.cancel_production_order",
      { p_id: OP, p_reason: "Falta de materia prima", p_returns: [] },
    ]);
  });

  test("exige motivo", async () => {
    expect((await cancelOrder({ id: OP, reason: "ab" })).ok).toBe(false);
    expect(rpcCalls()).toEqual([]);
  });
});

describe("createPurchaseFromShortages", () => {
  test("verifica el proveedor y devuelve el id de la compra creada", async () => {
    state.rpc.create_purchase_from_shortages = { data: { id: "po-9" }, error: null };
    expect(await createPurchaseFromShortages({ orderId: OP, supplierId: SUP })).toEqual({
      ok: true,
      data: { id: "po-9" },
    });
    expect(called("rpc.create_purchase_from_shortages")[0]).toEqual([
      "rpc.create_purchase_from_shortages",
      { p_order: OP, p_supplier: SUP },
    ]);
    expect(called("suppliers.eq")).toEqual(
      expect.arrayContaining([
        ["suppliers.eq", "id", SUP],
        ["suppliers.eq", "organization_id", ORG],
      ]),
    );
  });

  test("un proveedor de otra fábrica se rechaza", async () => {
    state.supplier = null;
    expect(await createPurchaseFromShortages({ orderId: OP, supplierId: SUP })).toEqual({
      ok: false,
      error: "No encontramos a ese proveedor en esta fábrica",
    });
    expect(rpcCalls()).toEqual([]);
  });

  test("'no tiene faltantes' llega legible", async () => {
    state.rpc.create_purchase_from_shortages = {
      data: null,
      error: { code: "P0001", message: "Esta orden no tiene faltantes de material" },
    };
    expect(await createPurchaseFromShortages({ orderId: OP, supplierId: SUP })).toEqual({
      ok: false,
      error: "Esta orden no tiene faltantes de material",
    });
  });
});
