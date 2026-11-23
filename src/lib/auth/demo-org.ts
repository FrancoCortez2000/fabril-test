import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * La fábrica marcada como demo pública. Se lee con el rol `anon` (o la sesión que haya): la base
 * sólo deja ver esa organización.
 */
export async function getPublicDemoOrganization(): Promise<{ id: string; name: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("is_public_demo", true)
    .maybeSingle();
  return data ?? null;
}
