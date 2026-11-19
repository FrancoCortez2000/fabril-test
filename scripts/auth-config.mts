/**
 * Aplica la configuración de Auth (registro público desactivado, URLs y emails en español).
 *   npm run auth:config
 */
import { buildAuthConfig } from "./lib/auth-config.mts";
import { fail, requireEnv } from "./lib/env.mts";

const env = requireEnv("SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN", "NEXT_PUBLIC_SITE_URL");
const config = buildAuthConfig(env.NEXT_PUBLIC_SITE_URL);

const res = await fetch(
  `https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/config/auth`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  },
);
if (!res.ok) fail(`Supabase respondió ${res.status}: ${await res.text()}`);

const applied = (await res.json()) as Record<string, unknown>;
console.log("✓ Configuración de Auth aplicada:");
console.log(`  registro público desactivado: ${applied.disable_signup === true ? "sí" : "NO"}`);
console.log(`  sitio: ${String(applied.site_url)}`);
console.log(`  redirecciones permitidas: ${String(applied.uri_allow_list)}`);
