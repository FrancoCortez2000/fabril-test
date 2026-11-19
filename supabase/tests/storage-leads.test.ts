import { createTestDb, type TestDb } from "./db";

let db: TestDb;
let userA: string;
let userB: string;
let orgA: string;
let orgB: string;

beforeAll(async () => {
  db = await createTestDb();
  userA = await db.createUser("ana@a.com");
  userB = await db.createUser("beto@b.com");
  orgA = await db.createOrg("Fábrica A", userA);
  orgB = await db.createOrg("Fábrica B", userB);
  await db.su.exec(
    `insert into storage.objects (bucket_id, name) values
       ('item-images', $1 || '/a.webp'), ('item-images', $2 || '/b.webp'), ('item-images', 'no-es-uuid/c.webp')`,
    [orgA, orgB],
  );
});
afterAll(() => db.close());

describe("storage", () => {
  test("los buckets existen, son privados y limitan tamaño y tipo", async () => {
    const buckets = await db.su.many<{ id: string; public: boolean; file_size_limit: string; allowed_mime_types: string[] }>(
      "select id, public, file_size_limit::text, allowed_mime_types from storage.buckets order by id",
    );
    expect(buckets).toEqual([
      { id: "employee-photos", public: false, file_size_limit: "2097152", allowed_mime_types: ["image/webp", "image/png", "image/jpeg"] },
      { id: "item-images", public: false, file_size_limit: "2097152", allowed_mime_types: ["image/webp", "image/png", "image/jpeg"] },
    ]);
  });

  test("un miembro ve sólo los archivos de su fábrica y una ruta inválida no rompe", async () => {
    const rows = await db.as(userA, (q) => q.many<{ name: string }>("select name from storage.objects"));
    expect(rows.map((r) => r.name)).toEqual([`${orgA}/a.webp`]);
  });

  test("un admin sube a su carpeta y no a la de otra fábrica", async () => {
    await db.as(userA, (q) =>
      q.exec("insert into storage.objects (bucket_id, name) values ('employee-photos', $1)", [`${orgA}/foto.webp`]),
    );
    await expect(
      db.as(userA, (q) =>
        q.exec("insert into storage.objects (bucket_id, name) values ('employee-photos', $1)", [`${orgB}/foto.webp`]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  test("anon no ve archivos", async () => {
    const rows = await db.as("anon", (q) => q.many("select name from storage.objects"));
    expect(rows).toHaveLength(0);
  });
});

describe("solicitudes de demostración", () => {
  const submit = (ip: string) =>
    db.as("service", (q) =>
      q.exec(
        "select public.submit_demo_request('Laura', 'Plásticos SA', 'laura@plasticos.com', '', 'Plásticos', 'Hola', $1)",
        [ip],
      ),
    );

  test("anon no puede insertar ni ejecutar la función", async () => {
    await expect(
      db.as("anon", (q) =>
        q.exec("insert into public.demo_requests (name, company, email) values ('a', 'b', 'c@d.com')"),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.as("anon", (q) => q.exec("select public.submit_demo_request('a','b','c@d.com','','','','x')")),
    ).rejects.toThrow(/permission denied/);
    await expect(db.as(userA, (q) => q.many("select * from public.demo_requests"))).rejects.toThrow(
      /permission denied/,
    );
  });

  test("hasta 3 solicitudes por conexión y hora", async () => {
    await submit("hash-1");
    await submit("hash-1");
    await submit("hash-1");
    await expect(submit("hash-1")).rejects.toThrow(
      "Recibimos varias solicitudes desde tu conexión. Probá de nuevo en un rato.",
    );
    await submit("hash-2");
    const count = await db.su.one<{ n: number }>("select count(*)::int as n from public.demo_requests");
    expect(count.n).toBe(4);
  });
});
