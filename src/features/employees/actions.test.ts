vi.mock("server-only", () => ({}));

type Call = [string, ...unknown[]];

const state = vi.hoisted(() => ({
  session: null as unknown,
  calls: [] as Call[],
  area: { id: "a" } as { id: string } | null,
  updated: [{ id: "e" }] as { id: string }[],
  inserted: [{ id: "new-1" }] as { id: string }[],
  error: null as null | { code?: string; message: string },
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
    from: (table: string) => {
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq", "update", "insert"]) {
        b[m] = (...args: unknown[]) => {
          state.calls.push([`${table}.${m}`, ...args]);
          return b;
        };
      }
      b.maybeSingle = async () => ({ data: table === "areas" ? state.area : null, error: null });
      b.then = (resolve: (v: unknown) => unknown) => {
        const wasInsert = state.calls.some((c) => c[0] === `${table}.insert`);
        return resolve({
          data: wasInsert ? state.inserted : state.updated,
          error: state.error,
        });
      };
      return b;
    },
  }),
}));

import { saveEmployee } from "@/features/employees/actions";
import { demoSession } from "@/lib/auth/demo";
import type { AppSession } from "@/lib/auth/types";

const ORG = "99999999-9999-4999-8999-999999999999";
const AREA = "22222222-2222-4222-8222-222222222222";
const EMP = "11111111-1111-4111-8111-111111111111";

const admin: AppSession = {
  user: { id: "u1", name: "Ana", email: "a@a.com" },
  organizations: [{ id: ORG, name: "Fábrica", isDemo: false, role: "admin" }],
  activeOrganizationId: ORG,
  role: "admin",
  mode: "member",
};

const values = {
  firstName: "Lucía",
  lastName: "Fernández",
  position: "Operaria",
  areaId: AREA,
  hourlyCost: 6200,
  status: "active",
};
const called = (name: string) => state.calls.filter((c) => c[0] === name);

beforeEach(() => {
  state.calls = [];
  state.session = admin;
  state.area = { id: AREA };
  state.updated = [{ id: EMP }];
  state.inserted = [{ id: "new-1" }];
  state.error = null;
});

test("en la demo no hace nada", async () => {
  state.session = demoSession({ id: ORG, name: "Demo" });
  expect(await saveEmployee(values)).toEqual({ ok: false, error: "No disponible en la demo" });
  expect(called("employees.insert")).toEqual([]);
});

test("sin rol no tiene permiso", async () => {
  state.session = { ...admin, role: null };
  expect((await saveEmployee(values)).ok).toBe(false);
  expect(called("employees.insert")).toEqual([]);
});

test("da de alta con la fábrica de la sesión, nunca la del cliente", async () => {
  const result = await saveEmployee({ ...values, organizationId: "otra" });
  expect(result).toEqual({ ok: true, data: { id: "new-1" } });
  const [, payload] = called("employees.insert")[0]!;
  expect(payload).toMatchObject({
    organization_id: ORG,
    first_name: "Lucía",
    last_name: "Fernández",
    area_id: AREA,
    hourly_cost: 6200,
    status: "active",
  });
  expect(called("revalidate").length).toBeGreaterThan(0);
});

test("edita acotando por id y fábrica", async () => {
  expect(await saveEmployee({ ...values, id: EMP })).toEqual({ ok: true, data: { id: EMP } });
  expect(called("employees.update")).toHaveLength(1);
  expect(called("employees.eq")).toEqual(
    expect.arrayContaining([
      ["employees.eq", "id", EMP],
      ["employees.eq", "organization_id", ORG],
    ]),
  );
});

test("un empleado de otra fábrica (0 filas) se rechaza", async () => {
  state.updated = [];
  expect(await saveEmployee({ ...values, id: EMP })).toEqual({
    ok: false,
    error: "No encontramos a ese empleado en esta fábrica",
  });
});

test("un área de otra fábrica se rechaza antes de escribir", async () => {
  state.area = null;
  expect(await saveEmployee(values)).toEqual({
    ok: false,
    error: "No encontramos esa área en esta fábrica",
  });
  expect(called("employees.insert")).toEqual([]);
  expect(called("areas.eq")).toEqual(
    expect.arrayContaining([
      ["areas.eq", "id", AREA],
      ["areas.eq", "organization_id", ORG],
    ]),
  );
});

test("sin área no consulta áreas", async () => {
  await saveEmployee({ ...values, areaId: null });
  expect(called("areas.select")).toEqual([]);
});

test("datos inválidos se rechazan sin tocar la base", async () => {
  expect((await saveEmployee({ ...values, hourlyCost: -5 })).ok).toBe(false);
  expect((await saveEmployee({ ...values, firstName: "" })).ok).toBe(false);
  expect(called("employees.insert")).toEqual([]);
});

test("un error de la base llega como mensaje", async () => {
  state.error = { message: "boom" };
  expect((await saveEmployee(values)).ok).toBe(false);
});
