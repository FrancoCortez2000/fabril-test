import "server-only";

import type { MemberRow } from "@/features/members/schemas";
import type { AppSession } from "@/lib/auth/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Usuarios de la fábrica activa. Las membresías se leen con la sesión (RLS garantiza que el usuario
 * pertenece a la fábrica); email y último ingreso salen de Auth con la clave secreta.
 */
export async function listMembers(session: AppSession): Promise<MemberRow[]> {
  const orgId = session.activeOrganizationId;
  const supabase = await createClient();
  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("user_id, status, profile:profiles(full_name)")
    .eq("organization_id", orgId);
  if (error) throw error;
  if (!memberships?.length) return [];

  const { data: accounts, error: accountsError } = await createAdminClient().rpc("admin_list_member_accounts", {
    p_org: orgId,
  });
  if (accountsError) throw accountsError;
  const byUser = new Map((accounts ?? []).map((a) => [a.user_id, a]));

  return memberships
    .map((m): MemberRow => {
      const account = byUser.get(m.user_id);
      return {
        userId: m.user_id,
        name: m.profile?.full_name ?? account?.email ?? "Usuario",
        email: account?.email ?? "",
        state: m.status === "disabled" ? "disabled" : account?.last_sign_in_at ? "active" : "pending",
        isCurrentUser: m.user_id === session.user.id,
      };
    })
    .sort((a, b) => Number(b.isCurrentUser) - Number(a.isCurrentUser) || a.name.localeCompare(b.name, "es"));
}
