import type { AppSession } from "@/lib/auth/types";

/**
 * Cookie-bandera del modo demo. NO es una credencial: sólo le dice a la app que muestre la demo
 * pública cuando no hay sesión. Los datos los protege la base (RLS para `anon`).
 */
export const DEMO_COOKIE = "fabril_demo";

/** Sesión del visitante de la demo pública: sin rol, una única fábrica (la demo). */
export function demoSession(org: { id: string; name: string }): AppSession {
  return {
    user: { id: "demo", name: "Visitante", email: "" },
    organizations: [{ id: org.id, name: org.name, isDemo: true, role: null }],
    activeOrganizationId: org.id,
    role: null,
    mode: "demo",
  };
}
