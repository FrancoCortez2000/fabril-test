import { createTestDb, type TestDb } from "./db";

// Vistas de lectura de Compras y Producción (security_invoker) y referencias de movement_feed.

let db: TestDb;
let admin: string;
let stranger: string;
let org: string;
let supplier: string;
let pead: string;
let mb: string;
let product: string;
let employee: string;
let po1: string; // parcial y vencida
let po2: string; // recibida completa, fecha vencida
let po3: string; // cancelada, fecha vencida
let po4: string; // pendiente, fecha futura
let order: string;
let manual: string;

const ins = (sql: string, p: unknown[]) => db.su.one<{ id: string }>(sql, p).then((r) => r.id);

async function purchase(
  q: Parameters<Parameters<TestDb["as"]>[1]>[0],
  expected: string,
  lines: { item: string; qty: number; price: number }[],
) {
  const po = await q.one<{ id: string }>(
    "insert into public.purchase_orders (organization_id, supplier_id, order_date, expected_date) values ($1, $2, '2026-09-01', $3) returning id",
    [org, supplier, expected],
  );
  for (const l of lines) {
    await q.exec(
      "insert into public.purchase_order_lines (organization_id, purchase_order_id, item_id, quantity, unit_price) values ($1, $2, $3, $4, $5)",
      [org, po.id, l.item, l.qty, l.price],
    );
  }
  await q.exec("select public.confirm_purchase_order($1)", [po.id]);
  return po.id;
}

const receiveAll = async (
  q: Parameters<Parameters<TestDb["as"]>[1]>[0],
  po: string,
  only?: string,
) => {
  const lines = await q.many<{ id: string; item_id: string; quantity: string }>(
    "select id, item_id, quantity::text from public.purchase_order_lines where purchase_order_id = $1",
    [po],
  );
  const chosen = lines
    .filter((l) => !only || l.item_id === only)
    .map((l) => ({ line_id: l.id, quantity: Number(l.quantity) }));
  await q.exec("select public.receive_purchase_order($1, 'R-1', null, $2)", [
    po,
    JSON.stringify(chosen),
  ]);
};

beforeAll(async () => {
  db = await createTestDb();
  admin = await db.createUser("ana@a.com");
  stranger = await db.createUser("beto@b.com");
  org = await db.createOrg("Demo A", admin, { isDemo: true });
  await db.createOrg("Fábrica B", stranger);
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
  employee = await ins(
    "insert into public.employees (organization_id, first_name, last_name, position, hourly_cost) values ($1, 'Juan', 'Sosa', 'Operario', 6000) returning id",
    [org],
  );

  await db.as(admin, async (q) => {
    po1 = await purchase(q, "2020-01-01", [
      { item: pead, qty: 100, price: 50 },
      { item: mb, qty: 100, price: 80 },
    ]);
    await receiveAll(q, po1, pead);
    po2 = await purchase(q, "2020-01-01", [{ item: mb, qty: 10, price: 80 }]);
    await receiveAll(q, po2);
    po3 = await purchase(q, "2020-01-01", [{ item: mb, qty: 5, price: 80 }]);
    await q.exec("select public.cancel_purchase_order($1, 'Cambio de proveedor')", [po3]);
    po4 = await purchase(q, "2999-01-01", [{ item: mb, qty: 5, price: 80 }]);

    manual = (
      await q.one<{ id: string }>(
        "select id from public.create_manual_movement($1, 'manual_in', 10, 'Conteo físico', 55)",
        [pead],
      )
    ).id;

    const op = await q.one<{ id: string }>(
      "select id from public.create_production_order($1, 100, null, null, 'normal', $2, '{}', null)",
      [product, employee],
    );
    order = op.id;
    await q.exec("select public.start_production_order($1)", [order]);
    await q.exec("select public.report_production_progress($1, 40, 2, $2, null, 'Primer turno')", [
      order,
      employee,
    ]);
  });
});
afterAll(() => db.close());

const rows = <R = Record<string, unknown>>(who: string, sql: string, params: unknown[] = []) =>
  db.as(who as never, (q) => q.many<R>(sql, params));

describe("purchase_overview", () => {
  test("estado, proveedor, líneas y porcentaje recibido", async () => {
    const [r] = await rows<Record<string, unknown>>(
      admin,
      "select * from public.purchase_overview where id = $1",
      [po1],
    );
    expect(r).toMatchObject({
      status: "partially_received",
      supplier_name: "Petroquímica Sur",
      line_count: 2,
      received_pct: 50,
      is_late: true,
    });
    expect(String(r?.code)).toMatch(/^OC-\d{4}-\d{4}$/);
  });

  test("is_late sólo vale para pendientes o parciales con fecha vencida", async () => {
    const r = await rows<{ id: string; is_late: boolean; status: string }>(
      admin,
      "select id, is_late, status from public.purchase_overview",
    );
    const by = Object.fromEntries(r.map((x) => [x.id, x]));
    expect(by[po1]?.is_late).toBe(true);
    expect(by[po2]).toMatchObject({ status: "received", is_late: false });
    expect(by[po3]).toMatchObject({ status: "cancelled", is_late: false });
    expect(by[po4]).toMatchObject({ status: "pending", is_late: false });
    expect(by[po3]?.id).toBe(po3);
  });

  test("otra fábrica no ve nada y anon sólo ve la demo pública", async () => {
    expect(await rows(stranger, "select id from public.purchase_overview")).toEqual([]);
    expect(await rows("anon", "select id from public.purchase_overview")).toEqual([]);
  });
});

describe("purchase_line_details", () => {
  test("pedido, recibido, pendiente y total de línea sin IVA", async () => {
    const r = await rows<Record<string, unknown>>(
      admin,
      "select item_name, item_sku, unit_code, quantity::float8 as quantity, received_qty::float8 as received_qty, pending_qty::float8 as pending_qty, line_total::float8 as line_total from public.purchase_line_details where purchase_order_id = $1 order by item_sku",
      [po1],
    );
    expect(r).toEqual([
      {
        item_name: "Masterbatch",
        item_sku: "MB",
        unit_code: "kg",
        quantity: 100,
        received_qty: 0,
        pending_qty: 100,
        line_total: 8000,
      },
      {
        item_name: "PEAD",
        item_sku: "PEAD",
        unit_code: "kg",
        quantity: 100,
        received_qty: 100,
        pending_qty: 0,
        line_total: 5000,
      },
    ]);
  });
});

describe("producción", () => {
  test("materiales con lo disponible", async () => {
    const [m] = await rows<Record<string, unknown>>(
      admin,
      "select item_name, unit_code, planned_qty::float8 as planned, consumed_qty::float8 as consumed, available::float8 as available from public.production_material_details where production_order_id = $1",
      [order],
    );
    expect(m).toMatchObject({ item_name: "PEAD", unit_code: "kg" });
    expect(Number(m?.planned)).toBeGreaterThan(0);
    expect(m?.consumed).toBe(m?.planned);
    expect(Number(m?.available)).toBeGreaterThan(0);
  });

  test("equipo con nombres, partes con empleado y eventos en orden", async () => {
    const [t] = await rows<Record<string, unknown>>(
      admin,
      "select first_name, last_name, position, role_in_order from public.production_team where production_order_id = $1",
      [order],
    );
    expect(t).toEqual({
      first_name: "Juan",
      last_name: "Sosa",
      position: "Operario",
      role_in_order: "responsable",
    });

    const [rep] = await rows<Record<string, unknown>>(
      admin,
      "select good_qty::float8 as good, defective_qty::float8 as defective, notes, employee_name from public.production_report_details where production_order_id = $1",
      [order],
    );
    expect(rep).toEqual({
      good: 40,
      defective: 2,
      notes: "Primer turno",
      employee_name: "Juan Sosa",
    });

    const ev = await rows<{ to_status: string }>(
      admin,
      "select to_status from public.production_event_details where production_order_id = $1 order by occurred_at, id",
      [order],
    );
    // Todo el armado corre en una sola transacción (mismo now()): se compara sin depender del orden.
    expect(ev.map((e) => e.to_status).sort()).toEqual(["in_progress", "in_progress", "planned"]);
  });

  test("otra fábrica no ve nada", async () => {
    for (const t of [
      "production_material_details",
      "production_team",
      "production_report_details",
      "production_event_details",
    ]) {
      expect(await rows(stranger, `select * from public.${t}`)).toEqual([]);
    }
  });
});

describe("movement_feed: documento de origen", () => {
  test("compra, producción y manual", async () => {
    const r = await rows<{
      movement_type: string;
      reference_type: string | null;
      reference_id: string | null;
      id: string;
    }>(admin, "select id, movement_type, reference_type, reference_id from public.movement_feed");
    const purchase = r.find((x) => x.reference_id === po1);
    expect(purchase).toMatchObject({
      movement_type: "purchase_receipt",
      reference_type: "purchase_order",
    });
    const production = r.find((x) => x.movement_type === "production_consumption");
    expect(production).toMatchObject({ reference_type: "production_order", reference_id: order });
    const manualRow = r.find((x) => x.id === manual);
    expect(manualRow).toMatchObject({ reference_type: null, reference_id: null });
  });
});

describe("con la demo pública", () => {
  beforeAll(async () => {
    await db.as("service", (q) => q.exec("select public.admin_set_public_demo($1)", [org]));
  });

  test("anon lee las vistas nuevas y la de órdenes", async () => {
    expect((await rows("anon", "select id from public.purchase_overview")).length).toBe(4);
    expect(
      (await rows("anon", "select id from public.purchase_line_details")).length,
    ).toBeGreaterThan(0);
    expect((await rows("anon", "select id from public.production_team")).length).toBe(1);
    expect((await rows("anon", "select id from public.production_order_overview")).length).toBe(1);
    expect((await rows("anon", "select id from public.movement_feed")).length).toBeGreaterThan(0);
  });
});
