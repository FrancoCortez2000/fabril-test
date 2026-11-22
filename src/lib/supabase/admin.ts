import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";
import { getSecretKey } from "@/lib/env.server";
import type { Database } from "@/types/database";

/**
 * Cliente con la clave secreta: saltea RLS. Sólo para tareas administrativas puntuales (invitar
 * usuarios, solicitudes de demo) y SIEMPRE después de verificar permisos con el cliente del usuario.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(getPublicEnv().supabaseUrl, getSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
