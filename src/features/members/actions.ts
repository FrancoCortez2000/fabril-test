"use server";

import { revalidatePath } from "next/cache";

import {
  inviteMemberSchema,
  memberRefSchema,
  memberStatusSchema,
  type InviteResult,
} from "@/features/members/schemas";
import { createAction } from "@/lib/actions";
import { ActionError } from "@/lib/db-errors";
import { getPublicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

const SETTINGS_PATH = "/app/configuracion";

function inviteLink(tokenHash: string, type: "invite" | "email") {
  const params = new URLSearchParams({ token_hash: tokenHash, type, next: "/restablecer" });
  return `${getPublicEnv().siteUrl}/auth/confirm?${params.toString()}`;
}

/**
 * Invita a una persona a la fábrica activa. Si no tiene cuenta, se crea y se devuelve un enlace de
 * invitación (24 h) para compartir; si ya tenía cuenta, sólo se le da acceso.
 */
export const inviteMember = createAction({
  schema: inviteMemberSchema,
  permission: "manageMembers",
  handler: async ({ fullName, email }, { orgId, session, supabase }): Promise<InviteResult> => {
    // Verificación con la sesión del usuario (RLS) antes de usar la clave secreta.
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("is_demo")
      .eq("id", orgId)
      .single();
    if (orgError || !org) throw new ActionError("No tenés permiso para hacer esto en esta fábrica");
    if (org.is_demo) throw new ActionError("Las organizaciones demo no admiten invitaciones");

    const admin = createAdminClient();
    const { data: existingId, error: findError } = await admin.rpc("admin_find_user_by_email", { p_email: email });
    if (findError) throw findError;

    let userId = existingId;
    let inviteUrl: string | null = null;
    if (!userId) {
      const { data, error } = await admin.auth.admin.generateLink({
        type: "invite",
        email,
        options: { data: { full_name: fullName } },
      });
      if (error || !data.user) throw new ActionError("No pudimos crear la invitación. Probá de nuevo.");
      userId = data.user.id;
      inviteUrl = inviteLink(data.properties.hashed_token, "invite");
    }

    const { error: insertError } = await admin
      .from("memberships")
      .insert({ organization_id: orgId, user_id: userId, role: "admin", invited_by: session.user.id });
    if (insertError) {
      if (insertError.code === "23505") throw new ActionError("Ese email ya tiene acceso a esta fábrica");
      throw insertError;
    }

    revalidatePath(SETTINGS_PATH);
    return { inviteUrl, existing: Boolean(existingId) };
  },
});

/** Genera un enlace nuevo para alguien que todavía no ingresó (el anterior venció o se perdió). */
export const regenerateInvite = createAction({
  schema: memberRefSchema,
  permission: "manageMembers",
  handler: async ({ userId }, { orgId, supabase }) => {
    const { data: membership } = await supabase
      .from("memberships")
      .select("user_id")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership) throw new ActionError("No encontramos ese usuario en esta fábrica");

    const admin = createAdminClient();
    const { data: accounts, error } = await admin.rpc("admin_list_member_accounts", { p_org: orgId });
    if (error) throw error;
    const account = accounts?.find((a) => a.user_id === userId);
    if (!account) throw new ActionError("No encontramos ese usuario en esta fábrica");
    if (account.last_sign_in_at) throw new ActionError("Esta persona ya ingresó: puede recuperar su contraseña desde la pantalla de ingreso");

    const { data, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: account.email });
    if (linkError) throw new ActionError("No pudimos generar el enlace. Probá de nuevo.");
    return { inviteUrl: inviteLink(data.properties.hashed_token, "email") };
  },
});

/** Habilita o deshabilita el acceso de un usuario (la base impide quedarse sin administradores). */
export const setMemberStatus = createAction({
  schema: memberStatusSchema,
  permission: "manageMembers",
  handler: async ({ userId, status }, { orgId, session, supabase }) => {
    if (userId === session.user.id && status === "disabled") {
      throw new ActionError("No podés deshabilitar tu propio usuario");
    }
    const { data, error } = await supabase
      .from("memberships")
      .update({ status })
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .select("user_id");
    if (error) throw error;
    if (!data?.length) throw new ActionError("No encontramos ese usuario en esta fábrica");
    revalidatePath(SETTINGS_PATH);
    return null;
  },
});
