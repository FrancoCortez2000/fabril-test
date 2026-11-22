import { createTestDb, type TestDb } from "./db";

let db: TestDb;
let owner: string;
let other: string;
let realOrg: string;
let demo: string;
let demo2: string;

const count = (sql: string, params: unknown[] = []) =>
  db.su.one<{ n: number }>(sql, params).then((r) => r.n);

async function fingerprint(org: string) {
  return db.su.one<Record<string, string>>(
    `select
       (select count(*) from public.items where organization_id = $1)::text as items,
       (select count(*) from public.purchase_orders where organization_id = $1)::text as purchases,
       (select count(*) from public.production_orders where organization_id = $1)::text as orders,
       (select count(*) from public.stock_movements where organization_id = $1)::text as movements,
       (select coalesce(sum(current_stock * avg_cost), 0)::numeric(18,2)::text from public.items where organization_id = $1) as value`,
    [org],
  );
}

beforeAll(async () => {
  db = await createTestDb();
  owner = await db.createUser("laura@plasticos.com", "Laura Benítez");
  other = await db.createUser("otro@plasticos.com");
  realOrg = await db.createOrg("Mi fábrica real", owner);
  const create = (user: string) =>
    db.as("service", (q) =>
      q.one<{ id: string }>("select public.admin_create_demo_organization($1) as id", [user]),
    );
  const t0 = Date.now();
  demo = (await create(owner)).id;
  console.info(`seed demo: ${Date.now() - t0} ms`);
  demo2 = (await create(other)).id;
}, 300_000);
afterAll(() => db.close());

test("la organización demo queda marcada y con el usuario como admin", async () => {
  const org = await db.su.one<{ name: string; is_demo: boolean }>(
    "select name, is_demo from public.organizations where id = $1",
    [demo],
  );
  expect(org).toEqual({ name: "Plásticos del Litoral S.A.", is_demo: true });
  const visible = await db.as(owner, (q) =>
    q.many<{ id: string }>("select id from public.organizations order by is_demo"),
  );
  expect(visible.map((o) => o.id)).toEqual([realOrg, demo]);
});

test("el catálogo tiene 12 productos con receta y 14 materias primas", async () => {
  expect(
    await count(
      "select count(*)::int as n from public.items where organization_id = $1 and type = 'finished_good'",
      [demo],
    ),
  ).toBe(12);
  expect(
    await count(
      "select count(*)::int as n from public.items where organization_id = $1 and type = 'raw_material'",
      [demo],
    ),
  ).toBe(14);
  expect(
    await count("select count(*)::int as n from public.boms where organization_id = $1", [demo]),
  ).toBe(12);
  expect(
    await count("select count(*)::int as n from public.suppliers where organization_id = $1", [
      demo,
    ]),
  ).toBe(5);
  expect(
    await count("select count(*)::int as n from public.areas where organization_id = $1", [demo]),
  ).toBe(7);
  expect(
    await count("select count(*)::int as n from public.employees where organization_id = $1", [
      demo,
    ]),
  ).toBe(16);
});

test("hay entre 30 y 40 compras y entre 55 y 65 órdenes de producción", async () => {
  const purchases = await count(
    "select count(*)::int as n from public.purchase_orders where organization_id = $1",
    [demo],
  );
  const orders = await count(
    "select count(*)::int as n from public.production_orders where organization_id = $1",
    [demo],
  );
  expect(purchases).toBeGreaterThanOrEqual(30);
  expect(purchases).toBeLessThanOrEqual(40);
  expect(orders).toBeGreaterThanOrEqual(55);
  expect(orders).toBeLessThanOrEqual(65);
});

test("aparecen todos los estados de compra y de producción", async () => {
  const ps = await db.su.many<{ status: string }>(
    "select distinct status from public.purchase_orders where organization_id = $1",
    [demo],
  );
  expect(ps.map((s) => s.status).sort()).toEqual(
    ["cancelled", "closed", "draft", "partially_received", "pending", "received"].sort(),
  );
  const os = await db.su.many<{ status: string }>(
    "select distinct status from public.production_orders where organization_id = $1",
    [demo],
  );
  expect(os.map((s) => s.status).sort()).toEqual(
    ["cancelled", "completed", "in_progress", "planned", "quality_check"].sort(),
  );
});

test("hay al menos 3 órdenes demoradas y 3 ítems bajo el mínimo", async () => {
  const delayed = await db.as(owner, (q) =>
    q.one<{ n: number }>(
      "select count(*)::int as n from public.production_order_overview where organization_id = $1 and is_delayed",
      [demo],
    ),
  );
  expect(delayed.n).toBeGreaterThanOrEqual(3);
  const low = await db.as(owner, (q) =>
    q.one<{ n: number }>(
      "select count(*)::int as n from public.item_stock_status where organization_id = $1 and level <> 'ok'",
      [demo],
    ),
  );
  expect(low.n).toBeGreaterThanOrEqual(3);
});

test("el stock cierra, no hay negativos ni fechas futuras", async () => {
  const bad = await db.su.many(
    `select i.id from public.items i left join public.stock_movements m on m.item_id = i.id
     where i.organization_id = $1
     group by i.id, i.current_stock having i.current_stock <> coalesce(sum(m.quantity), 0)`,
    [demo],
  );
  expect(bad).toEqual([]);
  expect(
    await count(
      "select count(*)::int as n from public.items where organization_id = $1 and current_stock < 0",
      [demo],
    ),
  ).toBe(0);
  expect(
    await count(
      "select count(*)::int as n from public.stock_movements where organization_id = $1 and occurred_at > now()",
      [demo],
    ),
  ).toBe(0);
  const types = await db.su.many<{ movement_type: string }>(
    "select distinct movement_type from public.stock_movements where organization_id = $1",
    [demo],
  );
  expect(types.map((t) => t.movement_type)).toEqual(
    expect.arrayContaining([
      "purchase_receipt",
      "production_output",
      "production_consumption",
      "manual_out",
      "adjustment",
    ]),
  );
});

test("la historia es cronológica: el kardex sigue el orden de las fechas", async () => {
  const bad = await db.su.many(
    `select id from (
       select id, balance_after, quantity,
              lag(balance_after) over (partition by item_id order by occurred_at, created_at) as prev
       from public.stock_movements where organization_id = $1
     ) t where prev is not null and balance_after <> prev + quantity`,
    [demo],
  );
  expect(bad).toEqual([]);
});

test("la actividad reciente tiene historia con fechas pasadas", async () => {
  const n = await count(
    "select count(*)::int as n from public.activity_log where organization_id = $1",
    [demo],
  );
  expect(n).toBeGreaterThan(100);
  expect(
    await count(
      "select count(*)::int as n from public.activity_log where organization_id = $1 and occurred_at > now()",
      [demo],
    ),
  ).toBe(0);
});

test("es determinística: dos demos generan los mismos números", async () => {
  expect(await fingerprint(demo2)).toEqual(await fingerprint(demo));
});

test("un usuario no puede tener dos organizaciones demo", async () => {
  await expect(
    db.as("service", (q) => q.one("select public.admin_create_demo_organization($1)", [owner])),
  ).rejects.toThrow(
    "Este usuario ya tiene una organización demo: restablecela desde Configuración",
  );
});

test("sólo se restablecen organizaciones demo y sólo sus admins", async () => {
  await expect(
    db.as(owner, (q) => q.exec("select public.reset_demo_organization($1)", [realOrg])),
  ).rejects.toThrow("Sólo las organizaciones demo se pueden restablecer");
  await expect(
    db.as(other, (q) => q.exec("select public.reset_demo_organization($1)", [demo])),
  ).rejects.toMatchObject({ code: "42501" });
});

test("restablecer la demo conserva el id y las membresías y no toca la fábrica real", async () => {
  await db.as(owner, (q) =>
    q.exec("insert into public.categories (organization_id, name) values ($1, 'Mi categoría')", [
      realOrg,
    ]),
  );
  const realBefore = await fingerprint(realOrg);
  const demoBefore = await fingerprint(demo);
  await db.as(owner, (q) => q.exec("select public.reset_demo_organization($1)", [demo]));
  expect(await fingerprint(demo)).toEqual(demoBefore);
  expect(await fingerprint(realOrg)).toEqual(realBefore);
  const m = await db.su.one<{ role: string }>(
    "select role from public.memberships where organization_id = $1 and user_id = $2",
    [demo, owner],
  );
  expect(m.role).toBe("admin");
});

test("admin_create_demo_organization es sólo para el servidor", async () => {
  await expect(
    db.as(owner, (q) => q.one("select public.admin_create_demo_organization($1)", [owner])),
  ).rejects.toThrow(/permission denied/);
});
