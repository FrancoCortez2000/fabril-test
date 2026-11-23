import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { ACTIVE_ORG_COOKIE, resolveActiveOrganization } from "@/lib/auth/active-org";
import { DEMO_COOKIE, demoSession } from "@/lib/auth/demo";
import { getPublicDemoOrganization } from "@/lib/auth/demo-org";
import type { AppSession, SessionOrganization } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/server";

/**
 * Sesión validada del request: claims del JWT verificados, perfil, fábricas con membresía activa y
 * fábrica activa (cookie validada contra las membresías). `null` si no hay usuario.
 */
export const getSession = cache(async (): Promise<AppSession | null> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return null;
  const userId = claims.sub;

  const [profileRes, membershipsRes, cookieStore] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, last_organization_id")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("memberships")
      .select("role, organization:organizations(id, name, is_demo)")
      .eq("user_id", userId)
      .eq("status", "active"),
    cookies(),
  ]);

  const organizations: SessionOrganization[] = (membershipsRes.data ?? [])
    .flatMap((m) =>
      m.organization
        ? [
            {
              id: m.organization.id,
              name: m.organization.name,
              isDemo: m.organization.is_demo,
              role: m.role,
            },
          ]
        : [],
    )
    .sort((a, b) => Number(a.isDemo) - Number(b.isDemo) || a.name.localeCompare(b.name, "es"));

  const activeId = resolveActiveOrganization(
    organizations,
    cookieStore.get(ACTIVE_ORG_COOKIE)?.value,
    profileRes.data?.last_organization_id,
  );
  const active = organizations.find((o) => o.id === activeId);
  const email = typeof claims.email === "string" ? claims.email : "";

  return {
    user: {
      id: userId,
      name: profileRes.data?.full_name ?? (email.split("@")[0] || "Usuario"),
      email,
    },
    organizations,
    activeOrganizationId: active?.id ?? "",
    role: active?.role ?? null,
    mode: "member",
  };
});

/**
 * Exige sesión y al menos una fábrica activa; si no, redirige. Sin sesión pero con la cookie de la
 * demo, devuelve la sesión del visitante (sólo lectura). Una sesión real siempre tiene prioridad.
 */
export async function requireSession(): Promise<AppSession> {
  const session = await getSession();
  if (session) {
    if (!session.activeOrganizationId) redirect("/sin-acceso");
    return session;
  }
  if ((await cookies()).has(DEMO_COOKIE)) {
    const org = await getPublicDemoOrganization();
    if (!org) redirect("/ingresar?demo=no-disponible");
    return demoSession(org);
  }
  redirect("/ingresar");
}
