import { createTestDb, type TestDb } from "./db";

// item_catalog: vista plana (ítem + unidad + categoría + nivel de stock + costo) para las listas.

let db: TestDb;
let admin: string;
let stranger: string;
let org: string;
let orgB: string;
let pead: string;
let product: string;

const ins = (sql: string, p: unknown[]) => db.su.one<{ id: string }>(sql, p).then((r) => r.id);

beforeAll(async () => {
  db = await createTestDb();
  admin = await db.createUser("ana@a.com");
  stranger = await db.createUser("beto@b.com");
  org = await db.createOrg("Demo A", admin, { isDemo: true });
  orgB = await db.createOrg("Fábrica B", stranger);
  await db.su.exec(
    "update public.organizations set default_labor_rate = 6000, default_waste_pct = 3 where id = $1",
    [org],
  );
  const cat = await ins(
    "insert into public.categories (organization_id, name) values ($1, 'Resinas') returning id",
    [org],
  );
  pead = await ins(
    `insert into public.items (organization_id, type, sku, name, unit_id, min_stock, category_id)
     values ($1, 'raw_material', 'PEAD', 'PEAD', 1, 500, $2) returning id`,
    [org, cat],
  );
  product = await ins(
    `insert into public.items (organization_id, type, sku, name, unit_id, standard_labor_minutes, overhead_per_unit, manual_cost, sale_price)
     values ($1, 'finished_good', 'BID', 'Bidón', 3, 15, 20, 99999, 2500) returning id`,
    [org],
  );
  await ins(
    `insert into public.items (organization_id, type, sku, name, unit_id) values ($1, 'raw_material', 'B-1', 'Ajeno', 1) returning id`,
    [orgB],
  );
  const bom = await ins(
    "insert into public.boms (organization_id, item_id) values ($1, $2) returning id",
    [org, product],
  );
  await db.su.exec(
    "insert into public.bom_lines (organization_id, bom_id, component_item_id, quantity) values ($1, $2, $3, 0.25)",
    [org, bom, pead],
  );
  await db.su.exec(
    "select private.insert_movement($1, $2, 'purchase_receipt', 300, 1000, null, '{}'::jsonb, null, now())",
    [org, pead],
  );
});
afterAll(() => db.close());

const row = (who: string, id: string) =>
  db.as(who as never, (q) =>
    q.one<Record<string, unknown>>("select * from public.item_catalog where id = $1", [id]),
  );

test("una materia prima muestra categoría, unidad, nivel y su costo promedio", async () => {
  const r = await row(admin, pead);
  expect(r).toMatchObject({
    sku: "PEAD",
    type: "raw_material",
    category_name: "Resinas",
    unit_code: "kg",
    level: "low",
    standard_cost: null,
  });
  expect(Number(r.current_stock)).toBe(300);
  expect(Number(r.cost)).toBe(1000);
});

test("un producto muestra su costo estándar, no el costo manual", async () => {
  const r = await row(admin, product);
  // 0,25 × 1,03 → 0,258 kg × $1.000 + 15 min × $6.000/h + $20 indirectos
  expect(Number(r.standard_cost)).toBe(258 + 1500 + 20);
  expect(Number(r.cost)).toBe(1778);
  expect(r.category_name).toBeNull();
  expect(Object.keys(r)).not.toContain("manual_cost");
});

test("cada fábrica ve sólo lo suyo", async () => {
  const mine = await db.as(stranger, (q) =>
    q.many<{ sku: string }>("select sku from public.item_catalog"),
  );
  expect(mine.map((r) => r.sku)).toEqual(["B-1"]);
});

test("anon lee la demo pública y nada más", async () => {
  expect(await db.as("anon", (q) => q.many("select id from public.item_catalog"))).toEqual([]);
  await db.as("service", (q) => q.exec("select public.admin_set_public_demo($1)", [org]));
  const rows = await db.as("anon", (q) =>
    q.many<{ organization_id: string }>("select organization_id from public.item_catalog"),
  );
  expect(rows.length).toBe(2);
  expect(rows.every((r) => r.organization_id === org)).toBe(true);
  expect(orgB).toBeTruthy();
});
