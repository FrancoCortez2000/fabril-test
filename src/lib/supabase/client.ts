import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/** Cliente del navegador (sólo clave publicable; RLS protege los datos). */
export function createBrowserClient() {
  const env = getPublicEnv();
  return createSupabaseBrowserClient<Database>(env.supabaseUrl, env.supabaseKey);
}
