/**
 * Marca la demo del dueño como la demo pública (la que se ve en "Probar la demo", sin cuenta).
 *   npm run demo:publica -- --email "vos@empresa.com"
 * Si el dueño todavía no tiene una demo, la crea. Es idempotente y deja una sola demo pública.
 */
import { arg, fail } from "./lib/env.mts";
import { adminClient } from "./lib/supabase.mts";

const email = arg("email")?.toLowerCase();
if (!email) fail('Uso: npm run demo:publica -- --email "usuario@empresa.com"');

const admin = adminClient();
const { data: userId, error: findError } = await admin.rpc("admin_find_user_by_email", {
  p_email: email,
});
if (findError) fail(`No se pudo buscar el usuario: ${findError.message}`);
if (!userId) {
  fail(
    `No existe un usuario con el email ${email}. Crealo primero con: npm run fabrica:crear -- --nombre "..." --email "${email}"`,
  );
}

const { data: memberships, error: membershipsError } = await admin
  .from("memberships")
  .select("organization_id")
  .eq("user_id", userId)
  .eq("status", "active");
if (membershipsError) fail(`No se pudieron leer las fábricas: ${membershipsError.message}`);

const { data: demos, error: demosError } = await admin
  .from("organizations")
  .select("id, name")
  .eq("is_demo", true)
  .in(
    "id",
    (memberships ?? []).map((m) => m.organization_id as string),
  );
if (demosError) fail(`No se pudieron leer las demos: ${demosError.message}`);

let demo: { id: string; name: string } | undefined = demos?.[0];

if (!demo) {
  console.log("El usuario no tiene demo: generando 6 meses de historia (puede tardar un minuto)…");
  const { data: orgId, error } = await admin.rpc("admin_create_demo_organization", {
    p_user: userId,
  });
  if (error) fail(error.message);
  const { data: org } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", orgId)
    .single();
  demo = { id: String(orgId), name: org?.name ?? "Demo" };
}

const { error: publicError } = await admin.rpc("admin_set_public_demo", { p_org: demo.id });
if (publicError) fail(publicError.message);

console.log(`\n✓ Demo pública: ${demo.name} (id ${demo.id})`);
console.log("  Cualquiera puede recorrerla en /demo, sin cuenta y de solo lectura.");
