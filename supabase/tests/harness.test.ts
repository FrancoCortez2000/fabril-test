import { createTestDb, type TestDb } from "./db";

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
});
afterAll(() => db.close());

test("createUser crea la fila en auth.users", async () => {
  const id = await db.createUser("ana@fabrica.com");
  const row = await db.su.one<{ email: string }>("select email from auth.users where id = $1", [
    id,
  ]);
  expect(row.email).toBe("ana@fabrica.com");
});

test("as(user) expone el id en auth.uid()", async () => {
  const id = await db.createUser("beto@fabrica.com");
  const row = await db.as(id, (q) => q.one<{ id: string }>("select auth.uid() as id"));
  expect(row.id).toBe(id);
});

test("anon sin grants recibe permission denied", async () => {
  await db.su.exec(
    "create table public.harness_secret (id int); revoke all on public.harness_secret from anon, authenticated",
  );
  await expect(db.as("anon", (q) => q.many("select * from public.harness_secret"))).rejects.toThrow(
    /permission denied/,
  );
});

test("una transacción que falla se revierte", async () => {
  await db.su.exec(
    "create table public.harness_tx (id int); grant all on public.harness_tx to service_role",
  );
  await expect(
    db.as("service", async (q) => {
      await q.exec("insert into public.harness_tx values (1)");
      throw new Error("boom");
    }),
  ).rejects.toThrow("boom");
  const rows = await db.su.many("select * from public.harness_tx");
  expect(rows).toHaveLength(0);
});
