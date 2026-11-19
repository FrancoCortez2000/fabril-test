/** Error con un mensaje pensado para mostrarse tal cual al usuario. */
export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

const GENERIC = "No pudimos completar la operación. Probá de nuevo.";

const BY_CODE: Record<string, string> = {
  "42501": "No tenés permiso para hacer esto en esta fábrica",
  "23505": "Ya existe un registro con ese dato (por ejemplo, el mismo SKU)",
  "23503": "No se puede completar porque está vinculado a otros registros",
};

/**
 * Traduce errores de Postgres/Supabase a mensajes en español. Los errores de negocio (P0001) ya
 * vienen redactados desde la base; el resto nunca expone el detalle técnico.
 */
export function mapDbError(error: unknown): string {
  if (error instanceof ActionError) return error.message;
  if (typeof error === "object" && error !== null && "code" in error) {
    const { code, message } = error as { code?: unknown; message?: unknown };
    if (code === "P0001" && typeof message === "string" && message) return message;
    if (typeof code === "string" && BY_CODE[code]) return BY_CODE[code];
  }
  return GENERIC;
}
