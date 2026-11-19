/**
 * Crea la organización demo "Plásticos del Litoral S.A." y le da acceso al usuario indicado.
 *   npm run demo:crear -- --email "vos@empresa.com"
 * Los datos demo viven en su propia organización (badge DEMO): nunca se mezclan con los reales.
 */
import { arg, fail } from "./lib/env.mts";
import { adminClient } from "./lib/supabase.mts";

const email = arg("email")?.toLowerCase();
if (!email) fail('Uso: npm run demo:crear -- --email "usuario@empresa.com"');

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

console.log("Generando 6 meses de historia (puede tardar un minuto)…");
const started = Date.now();
const { data: orgId, error } = await admin.rpc("admin_create_demo_organization", {
  p_user: userId,
});
if (error) fail(error.message);

const count = async (table: string) => {
  const { count: n } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);
  return n ?? 0;
};
console.log(
  `\n✓ Demo creada en ${Math.round((Date.now() - started) / 1000)} s (id ${String(orgId)})`,
);
console.log(`  ítems: ${await count("items")}`);
console.log(`  órdenes de compra: ${await count("purchase_orders")}`);
console.log(`  órdenes de producción: ${await count("production_orders")}`);
console.log(`  movimientos de stock: ${await count("stock_movements")}`);
console.log(`\n  ${email} la ve en el selector de fábrica con la marca DEMO.`);
