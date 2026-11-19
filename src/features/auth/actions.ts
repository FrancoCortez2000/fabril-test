"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { loginSchema, recoverSchema, resetPasswordSchema } from "@/features/auth/schemas";
import { createPublicAction } from "@/lib/actions";
import { safeNextPath } from "@/lib/auth/redirect";
import { ActionError } from "@/lib/db-errors";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const RATE_LIMIT = "Hubo demasiados intentos. Esperá unos minutos y probá de nuevo.";

export const signIn = createPublicAction({
  schema: loginSchema.extend({ next: z.string().max(500).optional() }),
  handler: async ({ email, password, next }) => {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.code === "invalid_credentials") throw new ActionError("El email o la contraseña no son correctos");
      if (error.code === "over_request_rate_limit") throw new ActionError(RATE_LIMIT);
      throw new ActionError("No pudimos iniciar sesión. Probá de nuevo.");
    }
    redirect(safeNextPath(next));
  },
});

export const requestPasswordReset = createPublicAction({
  schema: recoverSchema,
  handler: async ({ email }) => {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getPublicEnv().siteUrl}/auth/confirm?next=/restablecer`,
    });
    // Mismo resultado exista o no el email (no se revela qué cuentas existen).
    if (error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
      throw new ActionError(RATE_LIMIT);
    }
    return null;
  },
});

export const updatePassword = createPublicAction({
  schema: resetPasswordSchema,
  handler: async ({ password }) => {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (!data?.claims?.sub) throw new ActionError("El enlace venció o ya se usó. Pedí uno nuevo.");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      if (error.code === "same_password") {
        throw new ActionError("La nueva contraseña tiene que ser distinta de la anterior");
      }
      if (error.code === "weak_password") throw new ActionError("Elegí una contraseña más segura");
      throw new ActionError("No pudimos guardar la contraseña. Probá de nuevo.");
    }
    redirect("/app");
  },
});

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/ingresar");
}
