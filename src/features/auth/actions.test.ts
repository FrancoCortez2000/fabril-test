vi.mock("server-only", () => ({}));

const supabase = vi.hoisted(() => ({
  signIn: vi.fn(),
  reset: vi.fn(),
  update: vi.fn(),
  claims: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  },
  unstable_rethrow: (e: unknown) => {
    if (e instanceof Error && e.message.startsWith("NEXT_REDIRECT")) throw e;
  },
}));
vi.mock("@/lib/env", () => ({ getPublicEnv: () => ({ siteUrl: "https://fabril.test" }) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      signInWithPassword: supabase.signIn,
      resetPasswordForEmail: supabase.reset,
      updateUser: supabase.update,
      getClaims: supabase.claims,
    },
  }),
}));

import { requestPasswordReset, signIn, updatePassword } from "@/features/auth/actions";

const DISABLED = { ok: false, error: "El ingreso está deshabilitado en este sitio" };

beforeEach(() => {
  vi.unstubAllEnvs();
  for (const fn of Object.values(supabase)) fn.mockReset();
});

describe("con LOGIN_DISABLED=1 (sitio público)", () => {
  beforeEach(() => vi.stubEnv("LOGIN_DISABLED", "1"));

  test("signIn se rechaza sin consultar a Supabase", async () => {
    expect(await signIn({ email: "a@a.com", password: "una-clave-larga-1" })).toEqual(DISABLED);
    expect(supabase.signIn).not.toHaveBeenCalled();
  });

  test("requestPasswordReset no manda ningún email", async () => {
    expect(await requestPasswordReset({ email: "a@a.com" })).toEqual(DISABLED);
    expect(supabase.reset).not.toHaveBeenCalled();
  });

  test("updatePassword no cambia nada", async () => {
    expect(
      await updatePassword({ password: "una-clave-larga-1", confirm: "una-clave-larga-1" }),
    ).toEqual(DISABLED);
    expect(supabase.update).not.toHaveBeenCalled();
  });
});

describe("sin la variable (tu máquina)", () => {
  test("signIn consulta a Supabase y traduce credenciales incorrectas", async () => {
    supabase.signIn.mockResolvedValue({ error: { code: "invalid_credentials" } });
    expect(await signIn({ email: "a@a.com", password: "una-clave-larga-1" })).toEqual({
      ok: false,
      error: "El email o la contraseña no son correctos",
    });
    expect(supabase.signIn).toHaveBeenCalledOnce();
  });

  test("con LOGIN_DISABLED distinto de 1 tampoco bloquea", async () => {
    vi.stubEnv("LOGIN_DISABLED", "0");
    supabase.signIn.mockResolvedValue({ error: { code: "invalid_credentials" } });
    await signIn({ email: "a@a.com", password: "una-clave-larga-1" });
    expect(supabase.signIn).toHaveBeenCalledOnce();
  });
});
