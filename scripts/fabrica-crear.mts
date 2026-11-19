/**
 * Alta de una fábrica nueva (tarea del proveedor del SaaS).
 *   npm run fabrica:crear -- --nombre "Plásticos Sur S.R.L." --email "dueno@plasticossur.com" [--admin "Nombre Apellido"]
 * Si el email no tiene cuenta, se crea y se imprime el enlace de invitación para compartir.
 */
import { arg, fail } from "./lib/env.mts";
import { adminClient, findOrInviteUser } from "./lib/supabase.mts";

const name = arg("nombre");
const email = arg("email")?.toLowerCase();
const adminName = arg("admin");
if (!name || !email)
  fail('Uso: npm run fabrica:crear -- --nombre "Nombre de la fábrica" --email "admin@empresa.com"');

const { userId, inviteUrl } = await findOrInviteUser(email, adminName);
const { data: orgId, error } = await adminClient().rpc("admin_create_organization", {
  p_name: name,
  p_admin_user: userId,
  p_is_demo: false,
});
if (error) fail(`No se pudo crear la fábrica: ${error.message}`);

console.log(`\n✓ Fábrica creada: ${name}`);
console.log(`  id: ${String(orgId)}`);
console.log(`  administrador: ${email}`);
if (inviteUrl) {
  console.log("\n  Enlace de invitación (vence en 24 horas, sirve una sola vez):");
  console.log(`  ${inviteUrl}`);
} else {
  console.log(
    "  El usuario ya tenía cuenta: ingresa con su contraseña y elige la fábrica en el selector.",
  );
}
