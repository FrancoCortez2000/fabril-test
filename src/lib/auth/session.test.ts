import { DEMO_COOKIE } from "@/lib/auth/demo";

vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  cookies: new Set<string>(),
  claims: null as { sub: string; email?: string } | null,
  demoOrg: null as { id: string; name: string } | null,
  memberships: [] as unknown[],
}));

class Redirected extends Error {
  constructor(public readonly to: string) {
    super(`redirect:${to}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirected(to);
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    has: (name: string) => state.cookies.has(name),
    get: (name: string) => (state.cookies.has(name) ? { name, value: "1" } : undefined),
  }),
}));
vi.mock("@/lib/auth/demo-org", () => ({ getPublicDemoOrganization: async () => state.demoOrg }));
vi.mock("@/lib/supabase/server", () => {
  const chain = (result: unknown) => {
    const c: Record<string, unknown> = {};
    c.select = () => c;
    c.eq = () => c;
    c.maybeSingle = async () => result;
    c.then = (resolve: (v: unknown) => unknown) => resolve(result);
    return c;
  };
  return {
    createClient: async () => ({
      auth: { getClaims: async () => ({ data: state.claims ? { claims: state.claims } : null }) },
      from: (table: string) =>
        table === "profiles"
          ? chain({ data: { full_name: "Franco Cortez", last_organization_id: null } })
          : chain({ data: state.memberships }),
    }),
  };
});

// `react.cache` sólo existe dentro de un request de React Server: acá es un passthrough.
vi.mock("react", async (orig) => ({
  ...(await orig<typeof import("react")>()),
  cache: <T>(fn: T) => fn,
}));

import { getSession, requireSession } from "@/lib/auth/session";

const REAL_MEMBERSHIP = {
  role: "admin",
  organization: { id: "org-real", name: "Mi fábrica", is_demo: false },
};

beforeEach(() => {
  state.cookies = new Set();
  state.claims = null;
  state.demoOrg = null;
  state.memberships = [];
});

describe("requireSession", () => {
  test("sin sesión ni demo manda a ingresar", async () => {
    await expect(requireSession()).rejects.toMatchObject({ to: "/ingresar" });
  });

  test("sin sesión y con la cookie de demo devuelve la sesión demo", async () => {
    state.cookies.add(DEMO_COOKIE);
    state.demoOrg = { id: "org-demo", name: "Plásticos del Litoral S.A." };
    const session = await requireSession();
    expect(session.mode).toBe("demo");
    expect(session.role).toBeNull();
    expect(session.activeOrganizationId).toBe("org-demo");
  });

  test("con la cookie de demo pero sin demo pública, avisa en el ingreso (sin bucle)", async () => {
    state.cookies.add(DEMO_COOKIE);
    await expect(requireSession()).rejects.toMatchObject({ to: "/ingresar?demo=no-disponible" });
  });

  test("con sesión real y la cookie de demo puesta manda la sesión real", async () => {
    state.cookies.add(DEMO_COOKIE);
    state.demoOrg = { id: "org-demo", name: "Demo" };
    state.claims = { sub: "user-1", email: "dueno@fabrica.com" };
    state.memberships = [REAL_MEMBERSHIP];
    const session = await requireSession();
    expect(session.mode).toBe("member");
    expect(session.role).toBe("admin");
    expect(session.activeOrganizationId).toBe("org-real");
  });

  test("con sesión real pero sin fábricas va a sin-acceso", async () => {
    state.claims = { sub: "user-1", email: "a@b.com" };
    await expect(requireSession()).rejects.toMatchObject({ to: "/sin-acceso" });
  });
});

describe("getSession", () => {
  test("sin membresías el rol es null, nunca admin", async () => {
    state.claims = { sub: "user-1", email: "a@b.com" };
    const session = await getSession();
    expect(session?.role).toBeNull();
    expect(session?.mode).toBe("member");
  });

  test("sin usuario devuelve null", async () => {
    expect(await getSession()).toBeNull();
  });
});
