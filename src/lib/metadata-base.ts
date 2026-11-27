type Source = Record<string, string | undefined>;

/**
 * Base de las URLs absolutas de los metadatos (por ejemplo, la imagen al compartir el link).
 * En Vercel usa el dominio de producción, que Vercel expone solo; si no, NEXT_PUBLIC_SITE_URL.
 */
export function metadataBase(source: Source): URL {
  const vercel = source.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return new URL(`https://${vercel}`);
  const site = source.NEXT_PUBLIC_SITE_URL?.trim();
  return new URL(site || "http://localhost:3000");
}
