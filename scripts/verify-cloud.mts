/**
 * Prueba de aislamiento contra el proyecto real (API pública, usuarios reales, RLS real).
 *   npm run db:verify
 * Crea dos fábricas temporales con un usuario cada una, intenta cruzar datos con la clave publicable
 * y lo borra todo al terminar, aunque alguna comprobación falle. Al final consulta el security advisor.
 */
import { randomBytes } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { requireEnv } from "./lib/env.mts";
import { adminClient, publicClient } from "./lib/supabase.mts";

const env = requireEnv("SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN");
const admin = adminClient();
const stamp = Date.now().toString(36);
const results: { check: string; ok: boolean; detail?: string }[] = [];

function record(check: string, ok: boolean, detail?: string) {
  results.push({ check, ok, detail });
}

type Tenant = {
  name: string;
  email: string;
  password: string;
  userId?: string;
  orgId?: string;
  itemId?: string;
  client?: SupabaseClient;
};

const tenants: Tenant[] = ["A", "B"].map((k) => ({
  name: `[verificación ${stamp}] Fábrica ${k}`,
  email: `verificacion+${stamp}-${k.toLowerCase()}@fabril.example`,
  password: `${randomBytes(18).toString("base64url")}9a`,
}));

async function setup(t: Tenant) {
  const { data, error } = await admin.auth.admin.createUser({
    email: t.email,
    password: t.password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`crear usuario: ${error?.message}`);
  t.userId = data.user.id;
  const { data: orgId, error: orgError } = await admin.rpc("admin_create_organization", {
    p_name: t.name,
    p_admin_user: t.userId,
    p_is_demo: false,
  });
  if (orgError) throw new Error(`crear fábrica: ${orgError.message}`);
  t.orgId = orgId as string;

  t.client = publicClient();
  const { error: signInError } = await t.client.auth.signInWithPassword({
    email: t.email,
    password: t.password,
  });
  if (signInError) throw new Error(`ingresar: ${signInError.message}`);

  const { data: item, error: itemError } = await t.client
    .from("items")
    .insert({
      organization_id: t.orgId,
      type: "raw_material",
      sku: `VER-${stamp}`,
      name: "Material de verificación",
      unit_id: 1,
    })
    .select("id")
    .single();
  if (itemError) throw new Error(`crear ítem: ${itemError.message}`);
  t.itemId = item.id as string;
  const { error: movError } = await t.client.rpc("create_manual_movement", {
    p_item: t.itemId,
    p_type: "manual_in",
    p_quantity: 10,
    p_reason: "Verificación",
    p_unit_cost: 100,
  });
  if (movError) throw new Error(`movimiento: ${movError.message}`);
}

async function checks() {
  const [a, b] = tenants as [Tenant, Tenant];
  const ca = a.client!;

  const orgs = await ca.from("organizations").select("id");
  record(
    "A ve sólo su fábrica",
    !orgs.error && orgs.data?.length === 1 && orgs.data[0]?.id === a.orgId,
  );

  const items = await ca.from("items").select("id, organization_id");
  record(
    "A no ve ítems de B",
    !items.error && (items.data ?? []).every((i) => i.organization_id === a.orgId),
  );

  const movs = await ca.from("stock_movements").select("id").eq("organization_id", b.orgId!);
  record("A no ve movimientos de B", !movs.error && movs.data?.length === 0);

  const members = await ca.from("memberships").select("user_id").eq("organization_id", b.orgId!);
  record("A no ve usuarios de B", !members.error && members.data?.length === 0);

  const insert = await ca.from("items").insert({
    organization_id: b.orgId,
    type: "raw_material",
    sku: `INTRUSO-${stamp}`,
    name: "Intruso",
    unit_id: 1,
  });
  record("A no puede crear ítems en B", Boolean(insert.error), insert.error?.code);

  const update = await ca
    .from("items")
    .update({ name: "Cambiado por A" })
    .eq("id", b.itemId!)
    .select("id");
  record("A no puede editar ítems de B", !update.error && update.data?.length === 0);

  const rpc = await ca.rpc("create_stock_adjustment", {
    p_item: b.itemId,
    p_counted_qty: 0,
    p_reason: "Intento cruzado",
  });
  record("A no puede ajustar stock de B (RPC)", rpc.error?.code === "42501", rpc.error?.code);

  const stock = await ca.from("stock_movements").insert({
    organization_id: a.orgId,
    item_id: a.itemId,
    movement_type: "manual_in",
    quantity: 1,
    unit_cost: 1,
  });
  record("Nadie inserta movimientos directo en el libro", Boolean(stock.error), stock.error?.code);

  const anon = publicClient();
  const anonOrgs = await anon.from("organizations").select("id");
  record("Anónimo no lee fábricas", Boolean(anonOrgs.error) || anonOrgs.data?.length === 0);
  const anonLead = await anon.rpc("submit_demo_request", {
    p_name: "x",
    p_company: "x",
    p_email: "x@x.com",
    p_phone: "",
    p_industry: "",
    p_message: "",
    p_ip_hash: "x",
  });
  record(
    "Anónimo no escribe solicitudes de demo directo",
    Boolean(anonLead.error),
    anonLead.error?.code,
  );
  const anonAdmin = await anon.rpc("admin_create_organization", {
    p_name: "x",
    p_admin_user: a.userId,
    p_is_demo: false,
  });
  record(
    "Anónimo no ejecuta funciones administrativas",
    Boolean(anonAdmin.error),
    anonAdmin.error?.code,
  );

  const signUp = await anon.auth.signUp({
    email: `intruso+${stamp}@fabril.example`,
    password: "Intruso2026x",
  });
  record(
    "El registro público está desactivado",
    Boolean(signUp.error),
    signUp.error?.code ?? signUp.error?.message,
  );
}

async function cleanup() {
  for (const t of tenants) {
    await t.client?.auth.signOut().catch(() => undefined);
    if (t.orgId) {
      const { error } = await admin.rpc("admin_delete_organization", {
        p_org: t.orgId,
        p_confirm_name: t.name,
      });
      if (error) console.error(`  No se pudo borrar ${t.name}: ${error.message}`);
    }
    if (t.userId) {
      const { error } = await admin.auth.admin.deleteUser(t.userId);
      if (error) console.error(`  No se pudo borrar ${t.email}: ${error.message}`);
    }
  }
}

async function advisors() {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/advisors/security`,
    {
      headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` },
    },
  );
  if (!res.ok) {
    record("Security advisor consultado", false, `HTTP ${res.status}`);
    return;
  }
  const body = (await res.json()) as {
    lints?: { name: string; level: string; title: string; detail?: string }[];
  };
  const lints = body.lints ?? [];
  const errors = lints.filter((l) => l.level === "ERROR");
  record(
    "Security advisor sin hallazgos de nivel ERROR",
    errors.length === 0,
    errors.map((e) => e.name).join(", "),
  );
  for (const l of lints)
    console.log(`  [advisor ${l.level}] ${l.title}${l.detail ? ` — ${l.detail}` : ""}`);
}

try {
  for (const t of tenants) await setup(t);
  await checks();
} catch (error) {
  record("Preparación de la prueba", false, (error as Error).message);
} finally {
  await cleanup();
}
await advisors();

console.log("");
for (const r of results)
  console.log(`${r.ok ? "✓" : "✗"} ${r.check}${!r.ok && r.detail ? ` (${r.detail})` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(
  failed
    ? `\n${failed} comprobación(es) fallaron.`
    : `\nTodas las comprobaciones pasaron (${results.length}).`,
);
process.exit(failed ? 1 : 0);
