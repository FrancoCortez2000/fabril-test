import "server-only";

import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";

import { runAction, type ActionDefinition, type ActionResult } from "@/lib/action-core";
import { can, type Permission } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import type { AppSession } from "@/lib/auth/types";
import { ActionError } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";

export type { ActionResult } from "@/lib/action-core";

export type ActionContext = {
  session: AppSession;
  /** Fábrica activa validada contra las membresías: nunca se toma del cliente. */
  orgId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

/**
 * Server Action del panel: valida con Zod, exige sesión y permiso, y traduce errores.
 * La base vuelve a verificar todo (RLS / has_role): esta es la primera línea, no la única.
 */
export function createAction<S extends z.ZodType, R>(
  def: ActionDefinition<S, R, ActionContext> & { permission?: Permission },
): (input: unknown) => Promise<ActionResult<R>> {
  return async (input) =>
    runAction(
      input,
      def,
      async () => {
        const session = await requireSession();
        // La demo pública es de sólo lectura: ninguna acción corre en modo demo.
        if (session.mode === "demo") throw new ActionError("No disponible en la demo");
        if (def.permission && !can(session.role, def.permission)) {
          throw new ActionError("No tenés permiso para hacer esto en esta fábrica");
        }
        return { session, orgId: session.activeOrganizationId, supabase: await createClient() };
      },
      unstable_rethrow,
    );
}

/** Acciones públicas (ingreso, recuperación, landing): validación y errores, sin sesión. */
export function createPublicAction<S extends z.ZodType, R>(
  def: ActionDefinition<S, R, undefined>,
): (input: unknown) => Promise<ActionResult<R>> {
  return async (input) => runAction(input, def, async () => undefined, unstable_rethrow);
}
