vi.mock("server-only", () => ({}));

type Call = [string, ...unknown[]];

const state = vi.hoisted(() => ({
  session: null as unknown,
  calls: [] as Call[],
  update: {
    data: [{ id: "org" }] as unknown,
    error: null as null | { code?: string; message: string },
  },
  org: { is_demo: true } as { is_demo: boolean } | null,
  rpc: { data: null as unknown, error: null as null | { code?: string; message: string } },
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
    for (const method of ["select", "eq", "update"]) {
      b[method] = (...args: unknown[]) => {
        state.calls.push([`organizations.${method}`, ...args]);
        return b;
      };
    }
    b.maybeSingle = async () => ({ data: state.org, error: null });
    b.then = (resolve: (v: unknown) => unknown) =>
      resolve({ data: state.update.data, error: state.update.error });
    return {
      from: () => b,
      rpc: async (name: string, args: unknown) => {
        state.calls.push([`rpc.${name}`, args]);
        return state.rpc;
      },
    };
  },
}));

import { resetDemoData, saveGeneralSettings } from "@/features/settings/actions";
import { demoSession } from "@/lib/auth/demo";
import type { AppSession } from "@/lib/auth/types";

const ORG = "99999999-9999-4999-8999-999999999999";

const admin: AppSession = {
  user: { id: "u1", name: "Ana", email: "a@a.com" },
  organizations: [{ id: ORG, name: "Fábrica", isDemo: false, role: "admin" }],
  activeOrganizationId: ORG,
  role: "admin",
  mode: "member",
};

const input = {
  name: "Plásticos Sur S.R.L.",
  legalName: "",
  cuit: "30-71234567-9",
  address: "",
  city: "Rosario",
  province: "Santa Fe",
  phone: "",
  email: "",
  timezone: "America/Argentina/Cordoba",
  defaultWastePct: 3,
  defaultLaborRate: 6000,
  allowNegativeStock: false,
};

const called = (name: string) => state.calls.filter((c) => c[0] === name);

beforeEach(() => {
  state.calls = [];
  state.session = admin;
  state.update = { data: [{ id: ORG }], error: null };
  state.org = { is_demo: true };
  state.rpc = { data: null, error: null };
});

describe("saveGeneralSettings", () => {
  test("en la demo no hace nada", async () => {
    state.session = demoSession({ id: ORG, name: "Demo" });
    expect(await saveGeneralSettings(input)).toEqual({
      ok: false,
      error: "No disponible en la demo",
    });
    expect(called("organizations.update")).toEqual([]);
  });

  test("sin rol no tiene permiso", async () => {
    state.session = { ...admin, role: null };
    expect((await saveGeneralSettings(input)).ok).toBe(false);
    expect(called("organizations.update")).toEqual([]);
  });

  test("valida antes de tocar la base", async () => {
    expect((await saveGeneralSettings({ ...input, cuit: "123" })).ok).toBe(false);
    expect(called("organizations.update")).toEqual([]);
  });

  test("actualiza sólo la fábrica activa, con vacíos como nulos", async () => {
    expect(await saveGeneralSettings(input)).toEqual({ ok: true, data: null });
    const [[, row]] = called("organizations.update") as [[string, Record<string, unknown>]];
    expect(row).toEqual({
      name: "Plásticos Sur S.R.L.",
      legal_name: null,
      cuit: "30-71234567-9",
      address: null,
      city: "Rosario",
      province: "Santa Fe",
      phone: null,
      email: null,
      timezone: "America/Argentina/Cordoba",
      default_waste_pct: 3,
      default_labor_rate: 6000,
      allow_negative_stock: false,
    });
    expect(called("organizations.eq")).toContainEqual(["organizations.eq", "id", ORG]);
    expect(called("revalidate").length).toBeGreaterThan(0);
  });

  test("la zona horaria inválida que rechaza la base llega tal cual", async () => {
    state.update = { data: null, error: { code: "P0001", message: "Zona horaria inválida" } };
    expect(await saveGeneralSettings({ ...input, timezone: "Marte/Olimpo" })).toEqual({
      ok: false,
      error: "Zona horaria inválida",
    });
  });

  test("si no se actualizó ninguna fila avisa", async () => {
    state.update = { data: [], error: null };
    expect(await saveGeneralSettings(input)).toEqual({
      ok: false,
      error: "No encontramos esa fábrica o no tenés permiso para editarla",
    });
  });
});

describe("resetDemoData", () => {
  test("en la demo pública (visitante) no hace nada", async () => {
    state.session = demoSession({ id: ORG, name: "Demo" });
    expect(await resetDemoData({})).toEqual({ ok: false, error: "No disponible en la demo" });
    expect(called("rpc.reset_demo_organization")).toEqual([]);
  });

  test("sólo se restablecen fábricas demo", async () => {
    state.org = { is_demo: false };
    expect(await resetDemoData({})).toEqual({
      ok: false,
      error: "Sólo las organizaciones demo se pueden restablecer",
    });
    expect(called("rpc.reset_demo_organization")).toEqual([]);
  });

  test("llama a la RPC con la fábrica activa y revalida todo el panel", async () => {
    expect(await resetDemoData({})).toEqual({ ok: true, data: null });
    expect(called("rpc.reset_demo_organization")[0]).toEqual([
      "rpc.reset_demo_organization",
      { p_org: ORG },
    ]);
    expect(called("revalidate")).toContainEqual(["revalidate", "/app", "layout"]);
  });

  test("el error de la base llega traducido", async () => {
    state.rpc = { data: null, error: { code: "42501", message: "denied" } };
    expect(await resetDemoData({})).toEqual({
      ok: false,
      error: "No tenés permiso para hacer esto en esta fábrica",
    });
  });
});
