import { createTestDb, type TestDb } from "./db";

// Empleados: el administrador de la fábrica los da de alta y los edita; nadie más escribe.

let db: TestDb;
let admin: string;
let outsider: string;
let org: string;
let otherOrg: string;
let employee: string;
let area: string;

beforeAll(async () => {
  db = await createTestDb();
  admin = await db.createUser("ana@a.com");
  outsider = await db.createUser("beto@b.com");
  org = await db.createOrg("Fábrica A", admin);
  otherOrg = await db.createOrg("Fábrica B", outsider);
  area = (
    await db.su.one<{ id: string }>(
      "insert into public.areas (organization_id, name) values ($1, 'Inyección') returning id",
      [org],
    )
  ).id;
  employee = (
    await db.su.one<{ id: string }>(
      "insert into public.employees (organization_id, first_name, last_name, hourly_cost) values ($1, 'Juan', 'Sosa', 6000) returning id",
      [org],
    )
  ).id;
});
afterAll(() => db.close());

test("el administrador da de alta un empleado con área y costo por hora", async () => {
  const row = await db.as(admin, (q) =>
    q.one<{ first_name: string; hourly_cost: string; status: string }>(
      `insert into public.employees (organization_id, first_name, last_name, position, area_id, hourly_cost)
       values ($1, 'Lucía', 'Fernández', 'Operaria', $2, 6200.5) returning first_name, hourly_cost::text, status`,
      [org, area],
    ),
  );
  expect(row).toEqual({ first_name: "Lucía", hourly_cost: "6200.50", status: "active" });
});

test("el administrador edita nombre, cargo, área, costo y estado", async () => {
  const rows = await db.as(admin, (q) =>
    q.many<{ position: string; status: string; hourly_cost: string }>(
      `update public.employees set first_name = 'Juan Pablo', position = 'Jefe de turno', area_id = $2,
              hourly_cost = 7000, status = 'inactive'
        where id = $1 returning position, status, hourly_cost::text`,
      [employee, area],
    ),
  );
  expect(rows).toEqual([{ position: "Jefe de turno", status: "inactive", hourly_cost: "7000.00" }]);
});

test("un costo por hora negativo o un estado inventado se rechazan", async () => {
  await expect(
    db.as(admin, (q) =>
      q.exec("update public.employees set hourly_cost = -1 where id = $1", [employee]),
    ),
  ).rejects.toThrow();
  await expect(
    db.as(admin, (q) =>
      q.exec("update public.employees set status = 'despedido' where id = $1", [employee]),
    ),
  ).rejects.toThrow();
});

test("no se puede mover un empleado a otra fábrica", async () => {
  await expect(
    db.as(admin, (q) =>
      q.exec("update public.employees set organization_id = $2 where id = $1", [
        employee,
        otherOrg,
      ]),
    ),
  ).rejects.toThrow();
});

test("otra fábrica no ve, no edita ni da de alta empleados ajenos", async () => {
  const seen = await db.as(outsider, (q) =>
    q.many("select id from public.employees where id = $1", [employee]),
  );
  expect(seen).toEqual([]);
  const changed = await db.as(outsider, (q) =>
    q.many("update public.employees set first_name = 'X' where id = $1 returning id", [employee]),
  );
  expect(changed).toEqual([]);
  await expect(
    db.as(outsider, (q) =>
      q.exec(
        "insert into public.employees (organization_id, first_name, last_name) values ($1, 'A', 'B')",
        [org],
      ),
    ),
  ).rejects.toThrow();
});

test("anon no escribe empleados", async () => {
  await expect(
    db.as("anon", (q) =>
      q.exec(
        "insert into public.employees (organization_id, first_name, last_name) values ($1, 'A', 'B')",
        [org],
      ),
    ),
  ).rejects.toThrow();
  await expect(
    db.as("anon", (q) =>
      q.exec("update public.employees set first_name = 'X' where id = $1", [employee]),
    ),
  ).rejects.toThrow();
});

test("anon ve los empleados sólo de la demo pública y sin created_by", async () => {
  expect(
    await db.as("anon", (q) => q.many("select id from public.employees where id = $1", [employee])),
  ).toEqual([]);
  await db.su.exec("update public.organizations set is_demo = true where id = $1", [org]);
  await db.as("service", (q) => q.exec("select public.admin_set_public_demo($1)", [org]));
  const seen = await db.as("anon", (q) =>
    q.many("select id, first_name from public.employees where id = $1", [employee]),
  );
  expect(seen).toHaveLength(1);
  // email, teléfono y costo por hora son datos personales: la demo no los lee
  for (const column of ["hourly_cost", "email", "phone", "created_by"]) {
    await expect(
      db.as("anon", (q) => q.many(`select ${column} from public.employees`)),
    ).rejects.toThrow();
  }
  await expect(
    db.as("anon", (q) => q.many("select created_by from public.employees")),
  ).rejects.toThrow();
});
