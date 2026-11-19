import { createTestDb, type TestDb } from "./db";

let db: TestDb;
let admin: string;
let outsider: string;
let org: string;
let pead: string;
let mb: string;
let product: string;
let employee: string;
let supplier: string;

type Order = {
  id: string;
  code: string;
  status: string;
  good_qty: string;
  defective_qty: string;
  planned_material_cost: string;
  planned_labor_cost: string;
  planned_overhead_cost: string;
  actual_material_cost: string | null;
  actual_labor_cost: string | null;
  actual_overhead_cost: string | null;
  actual_unit_cost: string | null;
};

const rpc = <R = Order>(sql: string, params: unknown[], who = admin) =>
  db.as(who, (q) => q.one<R>(sql, params));

function createOrder(qty: number, end: string | null = null) {
  return rpc(
    "select * from public.create_production_order($1, $2, null, $3::date, 'normal', $4, $5, 'Prueba')",
    [product, qty, end, employee, [employee]],
  );
}
const start = (id: string, who = admin) => rpc("select * from public.start_production_order($1)", [id], who);
const toQc = (id: string) => rpc("select * from public.send_to_quality_check($1)", [id]);
const stock = (id: string) =>
  db.su
    .one<{ s: string; a: string }>("select current_stock::text as s, avg_cost::text as a from public.items where id = $1", [id])
    .then((r) => ({ stock: Number(r.s), avg: Number(r.a) }));
const materials = (order: string) =>
  db.su
    .many<{ item_id: string; planned_qty: string; consumed_qty: string; returned_qty: string; scrap_qty: string; cost_consumed: string }>(
      "select item_id, planned_qty::text, consumed_qty::text, returned_qty::text, scrap_qty::text, cost_consumed::text from public.production_order_materials where production_order_id = $1",
      [order],
    )
    .then((rows) => Object.fromEntries(rows.map((r) => [r.item_id, r])));

async function inbound(item: string, qty: number, cost: number) {
  await db.su.exec("select private.insert_movement($1, $2, 'purchase_receipt', $3, $4, null, '{}'::jsonb, null, now())", [
    org,
    item,
    qty,
    cost,
  ]);
}

beforeAll(async () => {
  db = await createTestDb();
  admin = await db.createUser("ana@a.com");
  outsider = await db.createUser("beto@b.com");
  org = await db.createOrg("Fábrica A", admin);
  await db.createOrg("Fábrica B", outsider);
  await db.su.exec("update public.organizations set default_labor_rate = 6000, default_waste_pct = 3 where id = $1", [org]);
  const ins = (sql: string, p: unknown[]) => db.su.one<{ id: string }>(sql, p).then((r) => r.id);
  pead = await ins(
    "insert into public.items (organization_id, type, sku, name, unit_id) values ($1, 'raw_material', 'PEAD', 'PEAD', 1) returning id",
    [org],
  );
  mb = await ins(
    "insert into public.items (organization_id, type, sku, name, unit_id) values ($1, 'raw_material', 'MB-AZ', 'Masterbatch azul', 1) returning id",
    [org],
  );
  product = await ins(
    `insert into public.items (organization_id, type, sku, name, unit_id, standard_labor_minutes, overhead_per_unit)
     values ($1, 'finished_good', 'BID-5L', 'Bidón 5 L', 3, 15, 20) returning id`,
    [org],
  );
  const bom = await ins("insert into public.boms (organization_id, item_id) values ($1, $2) returning id", [org, product]);
  await db.su.exec(
    "insert into public.bom_lines (organization_id, bom_id, component_item_id, quantity) values ($1, $2, $3, 0.25), ($1, $2, $4, 0.005)",
    [org, bom, pead, mb],
  );
  employee = await ins(
    "insert into public.employees (organization_id, first_name, last_name, hourly_cost) values ($1, 'Juan', 'Sosa', 6000) returning id",
    [org],
  );
  supplier = await ins("insert into public.suppliers (organization_id, name) values ($1, 'Proveedor') returning id", [org]);
  await inbound(pead, 300, 1000);
  await inbound(mb, 10, 8000);
});
afterAll(() => db.close());

test("no se puede planificar un producto sin receta", async () => {
  const noBom = await db.su.one<{ id: string }>(
    "insert into public.items (organization_id, type, sku, name, unit_id) values ($1, 'finished_good', 'SIN', 'Sin receta', 3) returning id",
    [org],
  );
  await expect(
    rpc("select * from public.create_production_order($1, 10, null, null, 'normal', null, null, null)", [noBom.id]),
  ).rejects.toThrow("El producto no tiene receta: cargala antes de planificar");
});

describe("ciclo completo de una orden", () => {
  let order: Order;

  test("planificar copia materiales, calcula costos y compromete stock", async () => {
    order = await createOrder(1000);
    expect(order.status).toBe("planned");
    expect(order.code).toMatch(/^OP-\d{4}-0001$/);
    const m = await materials(order.id);
    expect(m[pead]?.planned_qty).toBe("257.500");
    expect(m[mb]?.planned_qty).toBe("5.150");
    expect(order).toMatchObject({
      planned_material_cost: "298700.00",
      planned_labor_cost: "1500000.00",
      planned_overhead_cost: "20000.00",
    });
    const st = await db.as(admin, (q) =>
      q.one<{ committed: string; available: string }>(
        "select committed::text, available::text from public.item_stock_status where item_id = $1",
        [pead],
      ),
    );
    expect(st).toEqual({ committed: "257.500", available: "42.500" });
    const assigned = await db.su.many("select * from public.production_order_assignments where production_order_id = $1", [
      order.id,
    ]);
    expect(assigned).toHaveLength(1);
  });

  test("iniciar con faltante lista sólo lo que falta y no consume nada", async () => {
    await db.as(admin, (q) => q.exec("select public.create_stock_adjustment($1, 5, 'Conteo')", [mb]));
    await expect(start(order.id)).rejects.toThrow(
      "No hay stock suficiente para iniciar: Masterbatch azul faltan 0,15 kg",
    );
    expect((await stock(pead)).stock).toBe(300);
    await db.as(admin, (q) => q.exec("select public.create_manual_movement($1, 'manual_in', 5, 'Reposición', 8000)", [mb]));
  });

  test("parte de avance en una orden planificada se rechaza", async () => {
    await expect(
      rpc("select * from public.report_production_progress($1, 10, 0, null, null, null)", [order.id]),
    ).rejects.toThrow(/no está en producción/);
  });

  test("iniciar consume lo planificado y una segunda vez falla", async () => {
    const started = await start(order.id);
    expect(started.status).toBe("in_progress");
    expect((await stock(pead)).stock).toBe(42.5);
    expect((await stock(mb)).stock).toBeCloseTo(4.85, 3);
    await expect(start(order.id)).rejects.toThrow(`La orden ${order.code} ya no está planificada`);
  });

  test("los partes de avance suman cantidades", async () => {
    await rpc("select * from public.report_production_progress($1, 600, 10, $2, null, 'Turno mañana')", [order.id, employee]);
    const o = await rpc("select * from public.report_production_progress($1, 400, 10, $2, null, null)", [order.id, employee]);
    expect(o).toMatchObject({ good_qty: "1000.000", defective_qty: "20.000" });
  });

  test("completar concilia consumos, valoriza y registra la reclasificación", async () => {
    await toQc(order.id);
    const done = await rpc(
      "select * from public.complete_production_order($1, 980, 40, $2, $3, 'OK')",
      [
        order.id,
        JSON.stringify([
          { item_id: pead, quantity: 250 },
          { item_id: mb, quantity: 5.4 },
        ]),
        JSON.stringify([{ employee_id: employee, hours: 40 }]),
      ],
    );
    // material: 257.500 − 7.500 (devolución a $1.000) + 41.200 + 0,25 × 8.000 (exceso) = 293.200
    // mano de obra: 40 h × 6.000 = 240.000 ; indirectos: 980 × 20 = 19.600 ; total 552.800
    expect(done).toMatchObject({
      status: "completed",
      good_qty: "980.000",
      defective_qty: "40.000",
      actual_material_cost: "293200.00",
      actual_labor_cost: "240000.00",
      actual_overhead_cost: "19600.00",
      actual_unit_cost: "564.0816",
    });
    expect((await stock(pead)).stock).toBe(50);
    expect((await stock(mb)).stock).toBeCloseTo(4.6, 3);
    const out = await db.su.one<{ quantity: string; unit_cost: string }>(
      "select quantity::text, unit_cost::text from public.stock_movements where production_order_id = $1 and movement_type = 'production_output'",
      [order.id],
    );
    expect(out).toEqual({ quantity: "980.000", unit_cost: "564.0816" });
    const m = await materials(order.id);
    expect(m[pead]).toMatchObject({ consumed_qty: "250.000", returned_qty: "7.500" });
    expect(m[mb]).toMatchObject({ consumed_qty: "5.400", scrap_qty: "0.250" });

    const events = await db.su.many<{ to_status: string; note: string | null }>(
      "select to_status, note from public.production_order_events where production_order_id = $1 order by occurred_at, id",
      [order.id],
    );
    expect(events.map((e) => e.to_status)).toEqual(
      expect.arrayContaining(["planned", "in_progress", "quality_check", "completed"]),
    );
    expect(events.some((e) => e.note?.includes("Calidad reclasificó 20 unidades como defectuosas"))).toBe(true);
  });
});

test("completar con cero unidades buenas no ingresa stock", async () => {
  const o = await createOrder(10);
  await start(o.id);
  await toQc(o.id);
  const done = await rpc("select * from public.complete_production_order($1, 0, 10, '[]'::jsonb, '[]'::jsonb, null)", [o.id]);
  expect(done.status).toBe("completed");
  expect(done.actual_unit_cost).toBeNull();
  const out = await db.su.many("select 1 from public.stock_movements where production_order_id = $1 and movement_type = 'production_output'", [
    o.id,
  ]);
  expect(out).toHaveLength(0);
});

test("cancelar en producción devuelve lo indicado y deja el resto como desperdicio", async () => {
  await inbound(pead, 200, 1000);
  const o = await createOrder(400); // PEAD 103 kg, MB 2,06 kg
  await start(o.id);
  const before = await stock(pead);
  const cancelled = await rpc("select * from public.cancel_production_order($1, 'Se rompió el molde', $2)", [
    o.id,
    JSON.stringify([{ item_id: pead, quantity: 100 }]),
  ]);
  expect(cancelled.status).toBe("cancelled");
  expect((await stock(pead)).stock).toBeCloseTo(before.stock + 100, 3);
  const m = await materials(o.id);
  expect(m[pead]).toMatchObject({ returned_qty: "100.000", scrap_qty: "3.000" });
  expect(m[mb]).toMatchObject({ returned_qty: "0.000", scrap_qty: "2.060" });
  await expect(
    rpc("select * from public.cancel_production_order($1, 'Otra vez', '[]'::jsonb)", [o.id]),
  ).rejects.toThrow(/no se puede cancelar/);
});

test("create_purchase_from_shortages arma un borrador con lo que falta", async () => {
  const big = await createOrder(2000); // PEAD 515 kg
  const st = await db.su.one<{ available: string }>("select available::text from public.item_stock_status where item_id = $1", [pead]);
  const expected = -Number(st.available);
  expect(expected).toBeGreaterThan(0);
  const po = await rpc<{ id: string; status: string }>("select * from public.create_purchase_from_shortages($1, $2)", [
    big.id,
    supplier,
  ]);
  expect(po.status).toBe("draft");
  const line = await db.su.one<{ quantity: string; unit_price: string }>(
    "select quantity::text, unit_price::text from public.purchase_order_lines where purchase_order_id = $1 and item_id = $2",
    [po.id, pead],
  );
  expect(Number(line.quantity)).toBeCloseTo(expected, 3);
  expect(line.unit_price).toBe("1000.0000");
  // se cancela para que no siga comprometiendo material en los tests siguientes
  await rpc("select * from public.cancel_production_order($1, 'Prueba terminada', '[]'::jsonb)", [big.id]);
});

test("una orden sin faltantes no genera compra", async () => {
  const small = await createOrder(1);
  await expect(
    rpc("select * from public.create_purchase_from_shortages($1, $2)", [small.id, supplier]),
  ).rejects.toThrow("Esta orden no tiene faltantes de material");
});

test("un usuario de otra fábrica no puede operar órdenes ajenas", async () => {
  const o = await createOrder(1);
  await expect(start(o.id, outsider)).rejects.toMatchObject({ code: "42501" });
  const seen = await db.as(outsider, (q) => q.many("select * from public.production_orders"));
  expect(seen).toHaveLength(0);
  const view = await db.as(outsider, (q) => q.many("select * from public.production_order_overview"));
  expect(view).toHaveLength(0);
});

test("status y cantidades no se editan a mano", async () => {
  const o = await createOrder(1);
  await expect(
    db.as(admin, (q) => q.exec("update public.production_orders set status = 'completed' where id = $1", [o.id])),
  ).rejects.toThrow(/permission denied/);
  await expect(
    db.as(admin, (q) =>
      q.exec("insert into public.production_orders (organization_id, item_id, planned_qty, code) values ($1, $2, 1, 'X')", [
        org,
        product,
      ]),
    ),
  ).rejects.toThrow(/permission denied/);
  const edited = await db.as(admin, (q) =>
    q.many("update public.production_orders set priority = 'urgent' where id = $1 returning id", [o.id]),
  );
  expect(edited).toHaveLength(1);
});

test("production_order_overview marca demoradas y calcula el avance", async () => {
  const late = await createOrder(100, "2020-01-01");
  const rows = await db.as(admin, (q) =>
    q.many<{ id: string; is_delayed: boolean; progress_pct: number; item_name: string }>(
      "select id, is_delayed, progress_pct, item_name from public.production_order_overview",
    ),
  );
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  expect(byId[late.id]).toMatchObject({ is_delayed: true, progress_pct: 0, item_name: "Bidón 5 L" });
  // la primera orden completó 980 de 1.000
  const completed = rows.find((r) => r.progress_pct === 98);
  expect(completed?.is_delayed).toBe(false);
});

test("los eventos de producción son inmutables", async () => {
  await expect(db.as("service", (q) => q.exec("delete from public.production_order_events"))).rejects.toThrow(
    /no se modifica/,
  );
});

test("invariante: stock = Σ movimientos", async () => {
  const bad = await db.su.many(
    `select i.id from public.items i left join public.stock_movements m on m.item_id = i.id
     group by i.id, i.current_stock having i.current_stock <> coalesce(sum(m.quantity), 0)`,
  );
  expect(bad).toEqual([]);
});
