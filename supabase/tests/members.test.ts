import { createTestDb, type TestDb } from "./db";

let db: TestDb;
let ana: string;
let beto: string;
let org: string;

beforeAll(async () => {
  db = await createTestDb();
  ana = await db.createUser("ana@a.com", "Ana");
  beto = await db.createUser("beto@b.com", "Beto");
  org = await db.createOrg("Fábrica A", ana);
  await db.createOrg("Fábrica B", beto);
  await db.su.exec("update auth.users set last_sign_in_at = now() where id = $1", [ana]);
});
afterAll(() => db.close());

test("admin_find_user_by_email encuentra sin distinguir mayúsculas y es sólo para el servidor", async () => {
  const found = await db.as("service", (q) =>
    q.one<{ id: string | null }>("select public.admin_find_user_by_email(' BETO@b.com ') as id"),
  );
  expect(found.id).toBe(beto);
  const none = await db.as("service", (q) =>
    q.one<{ id: string | null }>("select public.admin_find_user_by_email('nadie@x.com') as id"),
  );
  expect(none.id).toBeNull();
  await expect(
    db.as(ana, (q) => q.one("select public.admin_find_user_by_email('beto@b.com')")),
  ).rejects.toThrow(/permission denied/);
});

test("admin_list_member_accounts devuelve email y último ingreso de los miembros de la fábrica", async () => {
  const rows = await db.as("service", (q) =>
    q.many<{ user_id: string; email: string; last_sign_in_at: string | null }>(
      "select * from public.admin_list_member_accounts($1)",
      [org],
    ),
  );
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ user_id: ana, email: "ana@a.com" });
  expect(rows[0]?.last_sign_in_at).not.toBeNull();
  await expect(
    db.as(ana, (q) => q.many("select * from public.admin_list_member_accounts($1)", [org])),
  ).rejects.toThrow(/permission denied/);
});
