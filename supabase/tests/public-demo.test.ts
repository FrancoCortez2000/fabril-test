import { createTestDb, type TestDb } from "./db";

// Demo pública: el rol `anon` lee SOLO la organización marcada como pública y nunca escribe.

let db: TestDb;
let owner: string;
let other: string;
let demoA: string;
let demoC: string;
let orgB: string;
let kg: number;

async function seedItem(org: string, sku: string) {
  await db.su.exec(
    `insert into public.items (organization_id, type, sku, name, unit_id)
     values ('${org}', 'raw_material', '${sku}', 'Ítem ${sku}', ${kg})`,
  );
  await db.su.exec(
    `insert into public.categories (organization_id, name) values ('${org}', 'Cat ${sku}')`,
  );
}

beforeAll(async () => {
  db = await createTestDb();
  owner = await db.createUser("dueno@demo.com");
  other = await db.createUser("otro@b.com");
  demoA = await db.createOrg("Demo A", owner, { isDemo: true });
  demoC = await db.createOrg("Demo C", owner, { isDemo: true });
  orgB = await db.createOrg("Fábrica B", other);
  kg = (await db.su.one<{ id: number }>("select id from public.units where code = 'kg'")).id;
  await seedItem(demoA, "A-1");
  await seedItem(orgB, "B-1");
});
afterAll(() => db.close());

const setPublic = (org: string) =>
  db.as("service", (q) => q.exec("select public.admin_set_public_demo($1)", [org]));

test("sin demo pública, anon no ve organizaciones ni ítems", async () => {
  expect(await db.as("anon", (q) => q.many("select id from public.organizations"))).toEqual([]);
  expect(await db.as("anon", (q) => q.many("select id from public.items"))).toEqual([]);
});

describe("con demoA pública", () => {
  beforeAll(() => setPublic(demoA));

  test("anon ve sólo la organización pública y no sus columnas privadas", async () => {
    const rows = await db.as("anon", (q) =>
      q.many<{ id: string }>("select id from public.organizations"),
    );
    expect(rows.map((r) => r.id)).toEqual([demoA]);
    await expect(
      db.as("anon", (q) => q.many("select cuit from public.organizations")),
    ).rejects.toThrow(/permission denied/);
  });

  test("anon lee las tablas de negocio sólo de la demo pública", async () => {
    const tables = [
      "items",
      "categories",
      "boms",
      "bom_lines",
      "stock_movements",
      "activity_log",
      "production_orders",
      "purchase_orders",
      "item_stock_status",
      "production_order_overview",
    ];
    for (const t of tables) {
      const orgs = await db.as("anon", (q) =>
        q.many<{ organization_id: string }>(`select distinct organization_id from public.${t}`),
      );
      expect(orgs.every((r) => r.organization_id === demoA)).toBe(true);
    }
    const skus = await db.as("anon", (q) =>
      q.many<{ sku: string }>("select sku from public.items"),
    );
    expect(skus.map((s) => s.sku)).toEqual(["A-1"]);
    const units = await db.as("anon", (q) => q.many("select id from public.units"));
    expect(units.length).toBeGreaterThan(0);
  });

  test("anon no lee memberships, profiles, document_sequences ni demo_requests", async () => {
    for (const t of ["memberships", "profiles", "document_sequences", "demo_requests"]) {
      await expect(db.as("anon", (q) => q.many(`select * from public.${t}`))).rejects.toThrow(
        /permission denied/,
      );
    }
  });

  test("anon no lee datos de contacto ni costo de empleados", async () => {
    for (const col of ["email", "phone", "hourly_cost"]) {
      await expect(
        db.as("anon", (q) => q.many(`select ${col} from public.employees`)),
      ).rejects.toThrow(/permission denied/);
    }
    await expect(
      db.as("anon", (q) => q.many("select first_name, last_name from public.employees")),
    ).resolves.toBeDefined();
  });

  test("anon no puede escribir ni ejecutar las RPC de escritura", async () => {
    await expect(
      db.as("anon", (q) =>
        q.exec(
          `insert into public.items (organization_id, type, sku, name, unit_id)
           values ('${demoA}', 'raw_material', 'X', 'Intruso', ${kg})`,
        ),
      ),
    ).rejects.toThrow(/permission denied|row-level security/);
    await expect(
      db.as("anon", (q) =>
        q.exec(`update public.items set name = 'x' where organization_id = '${demoA}'`),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.as("anon", (q) =>
        q.exec(`delete from public.stock_movements where organization_id = '${demoA}'`),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.as("anon", (q) =>
        q.exec(`update public.organizations set name = 'x' where id = '${demoA}'`),
      ),
    ).rejects.toThrow(/permission denied/);
    const item = await db.su.one<{ id: string }>(
      `select id from public.items where organization_id = '${demoA}'`,
    );
    for (const call of [
      `select public.create_manual_movement('${item.id}', 'manual_in', 1, 'x')`,
      `select public.create_stock_adjustment('${item.id}', 1, 'x')`,
      `select public.reverse_stock_movement(gen_random_uuid(), 'x')`,
      `select public.reset_demo_organization('${demoA}')`,
      `select public.create_production_order('${item.id}', 1, null, null, 'normal', null, '{}', null)`,
    ]) {
      await expect(db.as("anon", (q) => q.exec(call))).rejects.toThrow(/permission denied/);
    }
  });

  test("un usuario ajeno ve la demo pública pero no puede escribirla", async () => {
    const skus = await db.as(other, (q) => q.many<{ sku: string }>("select sku from public.items"));
    expect(skus.map((s) => s.sku).sort()).toEqual(["A-1", "B-1"]);
    await expect(
      db.as(other, (q) =>
        q.exec(
          `insert into public.items (organization_id, type, sku, name, unit_id)
           values ('${demoA}', 'raw_material', 'Z', 'Intruso', ${kg})`,
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("admin_set_public_demo", () => {
  test("rechaza una organización que no es demo", async () => {
    await expect(setPublic(orgB)).rejects.toThrow(/Sólo una organización demo puede ser pública/);
  });

  test("mover la marca deja una sola pública", async () => {
    await setPublic(demoC);
    const rows = await db.su.many<{ id: string }>(
      "select id from public.organizations where is_public_demo",
    );
    expect(rows.map((r) => r.id)).toEqual([demoC]);
    await setPublic(demoC); // idempotente
    expect(
      (await db.su.many("select id from public.organizations where is_public_demo")).length,
    ).toBe(1);
  });

  test("no es ejecutable por authenticated ni anon", async () => {
    for (const who of [owner, "anon"] as const) {
      await expect(
        db.as(who, (q) => q.exec("select public.admin_set_public_demo($1)", [demoA])),
      ).rejects.toThrow(/permission denied/);
    }
  });

  test("authenticated no puede marcar su organización como pública", async () => {
    await expect(
      db.as(owner, (q) =>
        q.exec(`update public.organizations set is_public_demo = true where id = '${demoA}'`),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});
