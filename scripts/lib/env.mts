/**
 * Variables de entorno de los scripts. Se cargan con `node --env-file=.env.local`.
 * Nunca se imprimen valores: sólo los nombres que faltan.
 */
export function requireEnv<const K extends string>(...names: K[]): Record<K, string> {
  const missing = names.filter((n) => !process.env[n]?.trim());
  if (missing.length) {
    console.error(`Faltan variables en .env.local: ${missing.join(", ")}`);
    console.error("Copiá .env.example como .env.local y completalas (ver README → Supabase).");
    process.exit(1);
  }
  return Object.fromEntries(names.map((n) => [n, process.env[n]!.trim()])) as Record<K, string>;
}

/** Lee `--clave "valor"` de los argumentos. */
export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  const value = i >= 0 ? process.argv[i + 1] : undefined;
  return value && !value.startsWith("--") ? value : undefined;
}

export function fail(message: string): never {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}
