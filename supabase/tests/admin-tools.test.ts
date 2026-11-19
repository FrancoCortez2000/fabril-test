import { createTestDb, type TestDb } from "./db";

let db: TestDb;
let ana: string;
let org: string;
let keep: string;

beforeAll(async () => {
  db = await createTestDb();
  ana = await db.createUser("ana@a.com");
  org = await db.createOrg("[verificación] Fábrica temporal", ana);
  keep = await db.createOrg("Fábrica que queda", ana);
  const item = await db.su.one<{ id: string }>(
    "insert into public.items (organization_id, type, sku, name, unit_id) values ($1, 'raw_material', 'X', 'Material', 1) returning id",
    [org],
  );
  await db.as(ana, (q) =>
    q.exec("select public.create_manual_movement($1, 'manual_in', 5, 'Prueba', 10)", [item.id]),
  );
});
afterAll(() => db.close());

test("no es ejecutable por usuarios", async () => {
  await expect(
    db.as(ana, (q) =>
      q.exec("select public.admin_delete_organization($1, $2)", [
        org,
        "[verificación] Fábrica temporal",
      ]),
    ),
  ).rejects.toThrow(/permission denied/);
});

test("exige el nombre exacto como confirmación", async () => {
  await expect(
    db.as("service", (q) =>
      q.exec("select public.admin_delete_organization($1, 'Otro nombre')", [org]),
    ),
  ).rejects.toThrow("El nombre no coincide: no se borró la fábrica");
});

test("borra la fábrica con toda su historia y no toca las demás", async () => {
  await db.as("service", (q) =>
    q.exec("select public.admin_delete_organization($1, $2)", [
      org,
      "[verificación] Fábrica temporal",
    ]),
  );
  const left = await db.su.one<{ n: number }>(
    "select (select count(*) from public.organizations where id = $1) + (select count(*) from public.stock_movements where organization_id = $1) + (select count(*) from public.memberships where organization_id = $1) as n",
    [org],
  );
  expect(Number(left.n)).toBe(0);
  const kept = await db.su.one<{ n: number }>(
    "select count(*)::int as n from public.memberships where organization_id = $1",
    [keep],
  );
  expect(kept.n).toBe(1);
  // la protección vuelve a regir después del borrado
  await expect(db.as("service", (q) => q.exec("delete from public.activity_log"))).rejects.toThrow(
    /no se modifica/,
  );
});
