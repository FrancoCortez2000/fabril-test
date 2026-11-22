export type PublicEnv = { supabaseUrl: string; supabaseKey: string; siteUrl: string };

type Source = Record<string, string | undefined>;

function required(source: Source, name: string): string {
  const value = source[name]?.trim();
  if (!value) throw new Error(`Falta ${name} en .env.local`);
  return value;
}

function url(source: Source, name: string): string {
  const value = required(source, name);
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new Error(`${name} tiene que ser una URL completa (por ejemplo https://…)`);
  }
}

export function parsePublicEnv(source: Source): PublicEnv {
  return {
    supabaseUrl: url(source, "NEXT_PUBLIC_SUPABASE_URL"),
    supabaseKey: required(source, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    siteUrl: url(source, "NEXT_PUBLIC_SITE_URL"),
  };
}

/** Variables públicas. Next las inlinea sólo si se leen con su nombre literal. */
export function getPublicEnv(): PublicEnv {
  return parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });
}
