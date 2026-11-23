import { createTestDb, type TestDb } from "./db";

// La demo pública es anónima: `anon` no puede leer quién creó o modificó cada registro.

let db: TestDb;
let owner: string;
let org: string;

beforeAll(async () => {
  db = await createTestDb();
  owner = await db.createUser("ana@a.com", "Ana Pérez");
  org = await db.createOrg("Demo A", owner, { isDemo: true });
  await db.su.exec(
    "insert into public.items (organization_id, type, sku, name, unit_id) values ($1, 'finished_good', 'BID', 'Bidón', 3)",
    [org],
  );
  await db.su.exec(
    `insert into public.production_orders (organization_id, code, item_id, status, planned_qty)
     select $1, 'OP-T-1', id, 'planned', 10 from public.items where organization_id = $1`,
    [org],
  );
  await db.as("service", (q) => q.exec("select public.admin_set_public_demo($1)", [org]));
});
afterAll(() => db.close());

test("ninguna columna created_by ni actor_id es legible por anon en public", async () => {
  const leaks = await db.su.many<{ relname: string; attname: string }>(
    `select c.relname, a.attname
       from pg_attribute a
       join pg_class c on c.oid = a.attrelid
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'v') and not a.attisdropped
        and a.attname in ('created_by', 'actor_id')
        and has_column_privilege('anon', c.oid, a.attnum, 'select')
      order by 1, 2`,
  );
  expect(leaks).toEqual([]);
});

test("el resto de las columnas sigue legible", async () => {
  const items = await db.as("anon", (q) => q.many("select id, sku, name from public.items"));
  expect(items).toHaveLength(1);
  const orders = await db.as("anon", (q) =>
    q.many("select id, code, status, planned_qty from public.production_orders"),
  );
  expect(orders).toHaveLength(1);
  const overview = await db.as("anon", (q) =>
    q.many<{ code: string; item_name: string }>(
      "select code, item_name from public.production_order_overview",
    ),
  );
  expect(overview).toEqual([{ code: "OP-T-1", item_name: "Bidón" }]);
});

test("un miembro de la fábrica sigue leyendo todo, autores incluidos", async () => {
  const rows = await db.as(owner, (q) =>
    q.many<{ created_by: string | null }>("select created_by from public.production_orders"),
  );
  expect(rows).toHaveLength(1);
});
