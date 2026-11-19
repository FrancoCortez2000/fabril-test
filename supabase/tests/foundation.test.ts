import { createTestDb, type TestDb } from "./db";

let db: TestDb;
let userA: string;
let userB: string;
let orgA: string;
let orgB: string;

beforeAll(async () => {
  db = await createTestDb();
  userA = await db.createUser("ana@fabrica-a.com", "Ana Pérez");
  userB = await db.createUser("beto@fabrica-b.com", "Beto Gómez");
  orgA = await db.createOrg("Fábrica A", userA);
  orgB = await db.createOrg("Fábrica B", userB);
});
afterAll(() => db.close());

test("cada usuario ve sólo su organización", async () => {
  const rows = await db.as(userA, (q) => q.many<{ id: string }>("select id from public.organizations"));
  expect(rows.map((r) => r.id)).toEqual([orgA]);
});

test("anon no ve organizaciones", async () => {
  await expect(db.as("anon", (q) => q.many("select id from public.organizations"))).rejects.toThrow(
    /permission denied/,
  );
});

test("el perfil se crea al crear el usuario", async () => {
  const p = await db.su.one<{ full_name: string }>("select full_name from public.profiles where id = $1", [
    userA,
  ]);
  expect(p.full_name).toBe("Ana Pérez");

  const laura = await db.createUser("laura@x.com");
  const p2 = await db.su.one<{ full_name: string }>("select full_name from public.profiles where id = $1", [
    laura,
  ]);
  expect(p2.full_name).toBe("laura");
});

test("admin_create_organization no es ejecutable por authenticated ni anon", async () => {
  await expect(
    db.as(userA, (q) => q.one("select public.admin_create_organization('X', $1, false)", [userA])),
  ).rejects.toThrow(/permission denied for function/);
  await expect(
    db.as("anon", (q) => q.one("select public.admin_create_organization('X', $1, false)", [userA])),
  ).rejects.toThrow(/permission denied for function/);
});

test("el creador queda como admin activo", async () => {
  const m = await db.as(userA, (q) =>
    q.one<{ role: string; status: string }>(
      "select role, status from public.memberships where organization_id = $1 and user_id = $2",
      [orgA, userA],
    ),
  );
  expect(m).toEqual({ role: "admin", status: "active" });
});

test("no se puede deshabilitar al último admin", async () => {
  await expect(
    db.as(userA, (q) =>
      q.exec("update public.memberships set status = 'disabled' where organization_id = $1 and user_id = $2", [
        orgA,
        userA,
      ]),
    ),
  ).rejects.toThrow("La fábrica tiene que tener al menos un administrador activo");
});

test("con dos admins sí se puede deshabilitar a uno", async () => {
  const carla = await db.createUser("carla@fabrica-a.com");
  await db.su.exec(
    "insert into public.memberships (organization_id, user_id, role, status) values ($1, $2, 'admin', 'active')",
    [orgA, carla],
  );
  const rows = await db.as(userA, (q) =>
    q.many(
      "update public.memberships set status = 'disabled' where organization_id = $1 and user_id = $2 returning user_id",
      [orgA, carla],
    ),
  );
  expect(rows).toHaveLength(1);
  // un usuario deshabilitado deja de ver la organización
  const visible = await db.as(carla, (q) => q.many("select id from public.organizations"));
  expect(visible).toHaveLength(0);
});

test("no se puede borrar la membresía del último admin", async () => {
  await expect(
    db.su.exec("delete from public.memberships where organization_id = $1 and user_id = $2", [orgB, userB]),
  ).rejects.toThrow("La fábrica tiene que tener al menos un administrador activo");
});

test("next_document_code numera por tipo y año", async () => {
  const code = (t: string) =>
    db.su.one<{ c: string }>("select private.next_document_code($1, $2, now()) as c", [orgA, t]);
  const year = new Date().getUTCFullYear();
  expect((await code("OP")).c).toBe(`OP-${year}-0001`);
  expect((await code("OP")).c).toBe(`OP-${year}-0002`);
  expect((await code("OC")).c).toBe(`OC-${year}-0001`);
  // otra organización arranca su propia numeración
  const other = await db.su.one<{ c: string }>("select private.next_document_code($1, 'OP', now()) as c", [orgB]);
  expect(other.c).toBe(`OP-${year}-0001`);
});

test("un admin no puede cambiar is_demo ni mover membresías de organización", async () => {
  await expect(
    db.as(userA, (q) => q.exec("update public.organizations set is_demo = true where id = $1", [orgA])),
  ).rejects.toThrow(/permission denied/);
  await expect(
    db.as(userA, (q) =>
      q.exec("update public.memberships set organization_id = $1 where user_id = $2", [orgB, userA]),
    ),
  ).rejects.toThrow(/permission denied/);
});

test("un admin puede editar la configuración de su fábrica, no la de otra", async () => {
  const own = await db.as(userA, (q) =>
    q.many("update public.organizations set default_waste_pct = 4 where id = $1 returning id", [orgA]),
  );
  expect(own).toHaveLength(1);
  const other = await db.as(userA, (q) =>
    q.many("update public.organizations set default_waste_pct = 4 where id = $1 returning id", [orgB]),
  );
  expect(other).toHaveLength(0);
});

test("un usuario no puede actualizar membresías de otra fábrica", async () => {
  const rows = await db.as(userA, (q) =>
    q.many("update public.memberships set role = 'admin' where organization_id = $1 returning user_id", [orgB]),
  );
  expect(rows).toHaveLength(0);
});

test("authenticated no puede insertar membresías ni escribir activity_log", async () => {
  await expect(
    db.as(userA, (q) =>
      q.exec("insert into public.memberships (organization_id, user_id, role) values ($1, $2, 'admin')", [
        orgB,
        userA,
      ]),
    ),
  ).rejects.toThrow(/permission denied/);
  await expect(
    db.as(userA, (q) =>
      q.exec(
        "insert into public.activity_log (organization_id, entity_type, action, summary) values ($1, 'x', 'x', 'x')",
        [orgA],
      ),
    ),
  ).rejects.toThrow(/permission denied/);
});

test("los perfiles visibles son el propio y los de compañeros de fábrica", async () => {
  const rows = await db.as(userB, (q) => q.many<{ id: string }>("select id from public.profiles"));
  expect(rows.map((r) => r.id)).toEqual([userB]);
});

test("las funciones privadas no son accesibles para los roles de la API", async () => {
  await expect(
    db.as(userA, (q) => q.one("select private.next_document_code($1, 'OP', now())", [orgA])),
  ).rejects.toThrow(/permission denied/);
});
