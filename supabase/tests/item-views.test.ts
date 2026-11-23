import { createTestDb, type TestDb } from "./db";

// Vistas de lectura para las fichas: item_catalog.has_movements, movement_feed, bom_usage e
// item_purchase_lines.

let db: TestDb;
let admin: string;
let stranger: string;
let org: string;
let supplier: string;
let pead: string;
let mb: string;
let product: string;
let poCode: string;
let opCode: string;
let manual: string;

type Feed = {
  id: string;
  item_name: string;
  item_sku: string;
  unit_code: string;
  movement_type: string;
  quantity: string;
  reason: string | null;
  reference: string | null;
  reversible: boolean;
  reversed: boolean;
};

const feed = (who: string, itemId: string) =>
  db.as(who as never, (q) =>
    q.many<Feed>(
      `select id, item_name, item_sku, unit_code, movement_type, quantity::text, reason, reference, reversible, reversed
         from public.movement_feed where item_id = $1 order by occurred_at, id`,
      [itemId],
    ),
  );

beforeAll(async () => {
  db = await createTestDb();
  admin = await db.createUser("ana@a.com");
  stranger = await db.createUser("beto@b.com");
  org = await db.createOrg("Demo A", admin, { isDemo: true });
  await db.createOrg("Fábrica B", stranger);
  const ins = (sql: string, p: unknown[]) => db.su.one<{ id: string }>(sql, p).then((r) => r.id);
  supplier = await ins(
    "insert into public.suppliers (organization_id, name) values ($1, 'Petroquímica Sur') returning id",
    [org],
  );
  pead = await ins(
    "insert into public.items (organization_id, type, sku, name, unit_id) values ($1, 'raw_material', 'PEAD', 'PEAD', 1) returning id",
    [org],
  );
  mb = await ins(
    "insert into public.items (organization_id, type, sku, name, unit_id) values ($1, 'raw_material', 'MB', 'Masterbatch', 1) returning id",
    [org],
  );
  product = await ins(
    "insert into public.items (organization_id, type, sku, name, unit_id) values ($1, 'finished_good', 'BID', 'Bidón', 3) returning id",
    [org],
  );
  const bom = await ins(
    "insert into public.boms (organization_id, item_id, output_qty) values ($1, $2, 1) returning id",
    [org, product],
  );
  await db.su.exec(
    "insert into public.bom_lines (organization_id, bom_id, component_item_id, quantity) values ($1, $2, $3, 0.25)",
    [org, bom, pead],
  );

  // Compra recibida: 100 kg de PEAD a $50.
  await db.as(admin, async (q) => {
    const po = await q.one<{ id: string }>(
      "insert into public.purchase_orders (organization_id, supplier_id, order_date) values ($1, $2, '2026-10-01') returning id",
      [org, supplier],
    );
    await q.exec(
      "insert into public.purchase_order_lines (organization_id, purchase_order_id, item_id, quantity, unit_price) values ($1, $2, $3, 100, 50)",
      [org, po.id, pead],
    );
    await q.exec("select public.confirm_purchase_order($1)", [po.id]);
    const line = await q.one<{ id: string }>(
      "select id from public.purchase_order_lines where purchase_order_id = $1",
      [po.id],
    );
    await q.exec("select public.receive_purchase_order($1, 'R-1', null, $2)", [
      po.id,
      JSON.stringify([{ line_id: line.id, quantity: 100 }]),
    ]);
    poCode = (
      await q.one<{ code: string }>("select code from public.purchase_orders where id = $1", [
        po.id,
      ])
    ).code;

    // Entrada manual, luego revertida.
    manual = (
      await q.one<{ id: string }>(
        "select id from public.create_manual_movement($1, 'manual_in', 10, 'Conteo físico', 55)",
        [pead],
      )
    ).id;
    await q.exec("select public.reverse_stock_movement($1, 'Error de carga')", [manual]);

    // Orden de producción iniciada: consume PEAD.
    const op = await q.one<{ id: string; code: string }>(
      "select id, code from public.create_production_order($1, 100, null, null, 'normal', null, '{}', null)",
      [product],
    );
    opCode = op.code;
    await q.exec("select public.start_production_order($1)", [op.id]);
  });
});
afterAll(() => db.close());

test("item_catalog.has_movements distingue ítems con y sin historia", async () => {
  const rows = await db.as(admin, (q) =>
    q.many<{ id: string; has_movements: boolean }>(
      "select id, has_movements from public.item_catalog",
    ),
  );
  const by = Object.fromEntries(rows.map((r) => [r.id, r.has_movements]));
  expect(by[pead]).toBe(true);
  expect(by[mb]).toBe(false);
  expect(by[product]).toBe(false);
});

describe("movement_feed", () => {
  test("la compra recibida enlaza con su orden de compra y no es reversible a mano", async () => {
    const rows = await feed(admin, pead);
    const purchase = rows.find((r) => r.movement_type === "purchase_receipt");
    expect(purchase).toMatchObject({
      item_name: "PEAD",
      item_sku: "PEAD",
      unit_code: "kg",
      reference: poCode,
      reversible: false,
      reversed: false,
    });
    expect(Number(purchase?.quantity)).toBe(100);
  });

  test("el consumo de producción enlaza con la orden de producción", async () => {
    const rows = await feed(admin, pead);
    const use = rows.find((r) => r.movement_type === "production_consumption");
    expect(use?.reference).toBe(opCode);
    expect(Number(use?.quantity)).toBeLessThan(0);
    expect(use?.reversible).toBe(false);
  });

  test("una entrada manual revertida queda marcada y su reversión no es reversible", async () => {
    const rows = await feed(admin, pead);
    const original = rows.find((r) => r.id === manual);
    expect(original).toMatchObject({
      movement_type: "manual_in",
      reason: "Conteo físico",
      reversible: false,
      reversed: true,
    });
    const reversal = rows.find((r) => r.movement_type === "reversal");
    expect(reversal).toMatchObject({ reference: null, reversible: false, reversed: false });
  });

  test("una entrada manual sin revertir es reversible", async () => {
    const fresh = await db.as(admin, (q) =>
      q.one<{ id: string }>(
        "select id from public.create_manual_movement($1, 'manual_in', 1, 'Otra entrada', 50)",
        [mb],
      ),
    );
    const rows = await feed(admin, mb);
    expect(rows.find((r) => r.id === fresh.id)).toMatchObject({
      reversible: true,
      reversed: false,
    });
  });

  test("otra fábrica no ve los movimientos y anon sólo los de la demo pública", async () => {
    expect(await feed(stranger, pead)).toEqual([]);
    expect(await feed("anon", pead)).toEqual([]);
    await db.as("service", (q) => q.exec("select public.admin_set_public_demo($1)", [org]));
    expect((await feed("anon", pead)).length).toBeGreaterThan(0);
  });
});

test("bom_usage lista los productos cuya receta usa la materia prima", async () => {
  const rows = await db.as(admin, (q) =>
    q.many<Record<string, unknown>>("select * from public.bom_usage where item_id = $1", [pead]),
  );
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    product_id: product,
    product_name: "Bidón",
    product_sku: "BID",
    organization_id: org,
  });
  expect(Number(rows[0]?.quantity)).toBe(0.25);
  expect(Number(rows[0]?.output_qty)).toBe(1);
});

test("item_purchase_lines trae el historial de compras de la materia prima", async () => {
  const rows = await db.as(admin, (q) =>
    q.many<Record<string, unknown>>(
      "select *, order_date::text as order_date_text from public.item_purchase_lines where item_id = $1",
      [pead],
    ),
  );
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    purchase_code: poCode,
    supplier_name: "Petroquímica Sur",
    status: "received",
  });
  expect(Number(rows[0]?.quantity)).toBe(100);
  expect(Number(rows[0]?.unit_price)).toBe(50);
  expect(String(rows[0]?.order_date_text)).toBe("2026-10-01");
});
