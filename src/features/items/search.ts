/**
 * Deja el texto de búsqueda listo para armar un filtro de PostgREST (`or=(sku.ilike.%…%,…)`).
 * Se quitan los caracteres que el filtro interpreta (`,` `(` `)` `*` `%` `\` y comillas) para que
 * lo escrito por el usuario no pueda cambiar la consulta.
 */
export function sanitizeSearch(q: string): string {
  return q
    .replace(/[,()*%\\"'`]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100)
    .trim();
}
