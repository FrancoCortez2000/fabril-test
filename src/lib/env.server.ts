import "server-only";

/** Clave secreta: sólo servidor. Nunca se importa desde un componente cliente. */
export function getSecretKey(): string {
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!key) throw new Error("Falta SUPABASE_SECRET_KEY en .env.local");
  return key;
}
