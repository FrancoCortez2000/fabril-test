import { z } from "zod";

import { demoSession } from "@/lib/auth/demo";
import type { AppSession } from "@/lib/auth/types";

vi.mock("server-only", () => ({}));

const ctx = vi.hoisted(() => ({ session: null as unknown }));

vi.mock("next/navigation", () => ({
  unstable_rethrow: () => undefined,
  redirect: () => undefined,
}));
vi.mock("@/lib/auth/session", () => ({ requireSession: async () => ctx.session }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

import { createAction } from "@/lib/actions";

const memberSession = (role: AppSession["role"]): AppSession => ({
  user: { id: "u1", name: "Ana", email: "ana@a.com" },
  organizations: [{ id: "o1", name: "Fábrica", isDemo: false, role }],
  activeOrganizationId: "o1",
  role,
  mode: "member",
});

describe("createAction", () => {
  const schema = z.object({ n: z.number() });

  test("la sesión demo se rechaza antes de ejecutar el handler", async () => {
    ctx.session = demoSession({ id: "o-demo", name: "Demo" });
    const handler = vi.fn(async () => "hecho");
    const action = createAction({ schema, permission: "manageCatalog", handler });
    expect(await action({ n: 1 })).toEqual({ ok: false, error: "No disponible en la demo" });
    expect(handler).not.toHaveBeenCalled();
  });

  test("la sesión demo se rechaza también si la acción no pide permiso", async () => {
    ctx.session = demoSession({ id: "o-demo", name: "Demo" });
    const handler = vi.fn(async () => "hecho");
    const action = createAction({ schema, handler });
    expect(await action({ n: 1 })).toEqual({ ok: false, error: "No disponible en la demo" });
    expect(handler).not.toHaveBeenCalled();
  });

  test("un administrador ejecuta el handler", async () => {
    ctx.session = memberSession("admin");
    const handler = vi.fn(async () => "hecho");
    const action = createAction({ schema, permission: "manageCatalog", handler });
    expect(await action({ n: 1 })).toEqual({ ok: true, data: "hecho" });
    expect(handler).toHaveBeenCalledOnce();
  });

  test("un miembro sin rol no tiene permiso", async () => {
    ctx.session = memberSession(null);
    const handler = vi.fn(async () => "hecho");
    const action = createAction({ schema, permission: "manageCatalog", handler });
    expect(await action({ n: 1 })).toEqual({
      ok: false,
      error: "No tenés permiso para hacer esto en esta fábrica",
    });
    expect(handler).not.toHaveBeenCalled();
  });
});
