/**
 * Aplica la configuración de Auth (registro público desactivado, URLs y emails en español).
 *   npm run auth:config
 */
import { buildAuthConfig } from "./lib/auth-config.mts";
import { fail, requireEnv } from "./lib/env.mts";

const env = requireEnv("SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN", "NEXT_PUBLIC_SITE_URL");
const endpoint = `https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/config/auth`;
const headers = {
  Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
  "Content-Type": "application/json",
};

// Las plantillas en español sólo se pueden aplicar con un SMTP propio configurado.
const current = await fetch(endpoint, { headers });
if (!current.ok) fail(`Supabase respondió ${current.status}: ${await current.text()}`);
const hasSmtp = Boolean(((await current.json()) as { smtp_host?: string | null }).smtp_host);
const config = buildAuthConfig(env.NEXT_PUBLIC_SITE_URL, { emailTemplates: hasSmtp });

const res = await fetch(endpoint, { method: "PATCH", headers, body: JSON.stringify(config) });
if (!res.ok) fail(`Supabase respondió ${res.status}: ${await res.text()}`);

const applied = (await res.json()) as Record<string, unknown>;
console.log("✓ Configuración de Auth aplicada:");
console.log(`  registro público desactivado: ${applied.disable_signup === true ? "sí" : "NO"}`);
console.log(`  sitio: ${String(applied.site_url)}`);
console.log(`  redirecciones permitidas: ${String(applied.uri_allow_list)}`);
console.log(`  enlaces válidos por: ${Number(applied.mailer_otp_exp) / 3600} h`);
if (!hasSmtp) {
  console.log(
    "  ! Sin SMTP propio: los emails usan las plantillas de Supabase (en inglés). Configurá un SMTP\n" +
      "    en Authentication → Emails → SMTP Settings y volvé a correr este comando.",
  );
}
