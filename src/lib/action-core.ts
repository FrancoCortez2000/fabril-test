import { z } from "zod";

import { mapDbError } from "@/lib/db-errors";

export type ActionResult<R> =
  { ok: true; data: R } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type ActionDefinition<S extends z.ZodType, R, C> = {
  schema: S;
  handler: (data: z.output<S>, ctx: C) => Promise<R>;
};

/**
 * Núcleo de toda Server Action: valida con Zod, obtiene el contexto (sesión, permisos) y traduce
 * los errores. `rethrow` deja pasar los errores de control de Next (redirect, notFound).
 */
export async function runAction<S extends z.ZodType, R, C>(
  input: unknown,
  def: ActionDefinition<S, R, C>,
  getContext: () => Promise<C>,
  rethrow: (error: unknown) => void,
): Promise<ActionResult<R>> {
  const parsed = def.schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá los datos marcados",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }
  try {
    const ctx = await getContext();
    return { ok: true, data: await def.handler(parsed.data, ctx) };
  } catch (error) {
    rethrow(error);
    return { ok: false, error: mapDbError(error) };
  }
}
