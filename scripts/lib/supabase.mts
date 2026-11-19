import { createClient } from "@supabase/supabase-js";

import { requireEnv } from "./env.mts";

/** Cliente con la clave secreta (saltea RLS). Sólo para scripts del proveedor del SaaS. */
export function adminClient() {
  const env = requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY");
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Cliente con la clave publicable, como el navegador. */
export function publicClient() {
  const env = requireEnv("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Busca un usuario por email; si no existe lo crea con un enlace de invitación (24 h). */
export async function findOrInviteUser(email: string, fullName?: string) {
  const admin = adminClient();
  const { data: existing, error } = await admin.rpc("admin_find_user_by_email", { p_email: email });
  if (error) throw new Error(`No se pudo buscar el usuario: ${error.message}`);
  if (existing) return { userId: existing as string, inviteUrl: null as string | null };

  const { data, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: fullName ? { data: { full_name: fullName } } : undefined,
  });
  if (linkError || !data.user)
    throw new Error(`No se pudo crear la invitación: ${linkError?.message}`);
  const siteUrl = requireEnv("NEXT_PUBLIC_SITE_URL").NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  const params = new URLSearchParams({
    token_hash: data.properties.hashed_token,
    type: "invite",
    next: "/restablecer",
  });
  return { userId: data.user.id, inviteUrl: `${siteUrl}/auth/confirm?${params.toString()}` };
}
