import { createTestDb, type TestDb } from "./db";

let db: TestDb;
let admin: string;
let outsider: string;
let org: string;
let orgB: string;
let supplier: string;
let pead: string;
let mb: string;

type Po = {
  id: string;
  code: string;
  status: string;
  subtotal: string;
  tax_total: string;
  total: string;
};

async function createPo(lines: { item: string; qty: number; price: number; rate: number }[]) {
  return db.as(admin, async (q) => {
    const po = await q.one<{ id: string }>(
      "insert into public.purchase_orders (organization_id, supplier_id) values ($1, $2) returning id",
      [org, supplier],
    );
    for (const l of lines) {
      await q.exec(
        `insert into public.purchase_order_lines (organization_id, purchase_order_id, item_id, quantity, unit_price, tax_rate)
         values ($1, $2, $3, $4, $5, $6)`,
        [org, po.id, l.item, l.qty, l.price, l.rate],
      );
    }
    return po.id;
  });
}

const getPo = (id: string) =>
  db.su.one<Po>("select * from public.purchase_orders where id = $1", [id]);
const lineIds = (po: string) =>
  db.su
    .many<{ id: string; item_id: string }>(
      "select id, item_id from public.purchase_order_lines where purchase_order_id = $1",
      [po],
    )
    .then(
      (rows) => Object.fromEntries(rows.map((r) => [r.item_id, r.id])) as Record<string, string>,
    );
const item = (id: string) =>
  db.su.one<{ current_stock: string; avg_cost: string; last_purchase_cost: string | null }>(
    "select current_stock::text, avg_cost::text, last_purchase_cost::text from public.items where id = $1",
    [id],
  );
const confirm = (po: string, who = admin) =>
  db.as(who, (q) => q.one<Po>("select * from public.confirm_purchase_order($1)", [po]));
const receive = (po: string, lines: { line_id: string; quantity: number }[], who = admin) =>
  db.as(who, (q) =>
    q.one<{ id: string }>(
      "select * from public.receive_purchase_order($1, '0001-00004567', null, $2)",
      [po, JSON.stringify(lines)],
    ),
  );

beforeAll(async () => {
  db = await createTestDb();
  admin = await db.createUser("ana@a.com");
  outsider = await db.createUser("beto@b.com");
  org = await db.createOrg("Fábrica A", admin);
  orgB = await db.createOrg("Fábrica B", outsider);
  await db.as(admin, async (q) => {
    supplier = (
      await q.one<{ id: string }>(
        "insert into public.suppliers (organization_id, name) values ($1, 'Petroquímica Sur') returning id",
        [org],
      )
    ).id;
    pead = (
      await q.one<{ id: string }>(
        "insert into public.items (organization_id, type, sku, name, unit_id) values ($1, 'raw_material', 'PEAD', 'PEAD', 1) returning id",
        [org],
      )
    ).id;
    mb = (
      await q.one<{ id: string }>(
        "insert into public.items (organization_id, type, sku, name, unit_id) values ($1, 'raw_material', 'MB', 'Masterbatch', 1) returning id",
        [org],
      )
    ).id;
  });
});
afterAll(() => db.close());

test("el código se asigna solo y los totales incluyen IVA mixto al centavo", async () => {
  const id = await createPo([
    { item: pead, qty: 3.333, price: 1234.56, rate: 21 },
    { item: mb, qty: 2, price: 999.99, rate: 10.5 },
  ]);
  const po = await getPo(id);
  // 3,333 × 1234,56 = 4114,788 → 4114,79 ; 2 × 999,99 = 1999,98
  // IVA: 4114,788 × 21 % = 864,1055 → 864,11 ; 1999,98 × 10,5 % = 209,9979 → 210,00
  expect(po).toMatchObject({
    status: "draft",
    subtotal: "6114.77",
    tax_total: "1074.11",
    total: "7188.88",
  });
  expect(po.code).toMatch(/^OC-\d{4}-0001$/);
});

test("sólo se compran materias primas", async () => {
  const product = await db.su.one<{ id: string }>(
    "insert into public.items (organization_id, type, sku, name, unit_id) values ($1, 'finished_good', 'BID', 'Bidón', 3) returning id",
    [org],
  );
  await expect(createPo([{ item: product.id, qty: 1, price: 1, rate: 21 }])).rejects.toThrow(
    "Sólo se compran materias primas",
  );
});

test("status, code y totales no se editan a mano", async () => {
  const id = await createPo([{ item: pead, qty: 1, price: 1, rate: 21 }]);
  await expect(
    db.as(admin, (q) =>
      q.exec("update public.purchase_orders set status = 'received' where id = $1", [id]),
    ),
  ).rejects.toThrow(/permission denied/);
  await expect(
    db.as(admin, (q) => q.exec("update public.purchase_orders set total = 1 where id = $1", [id])),
  ).rejects.toThrow(/permission denied/);
  await expect(
    db.as(admin, (q) =>
      q.exec(
        "insert into public.purchase_orders (organization_id, supplier_id, status) values ($1, $2, 'received')",
        [org, supplier],
      ),
    ),
  ).rejects.toThrow(/permission denied/);
});

test("confirmar sin líneas da un mensaje claro", async () => {
  const id = await createPo([]);
  await expect(confirm(id)).rejects.toThrow("Agregá al menos un material antes de confirmar");
});

describe("ciclo de recepción", () => {
  let po: string;
  let lines: Record<string, string>;
  let firstReceipt: string;

  beforeAll(async () => {
    po = await createPo([
      { item: pead, qty: 100, price: 1000, rate: 21 },
      { item: mb, qty: 10, price: 8000, rate: 21 },
    ]);
    lines = await lineIds(po);
    expect((await confirm(po)).status).toBe("pending");
  });

  test("con la orden confirmada ya no se pueden editar sus líneas", async () => {
    const rows = await db.as(admin, (q) =>
      q.many(
        "update public.purchase_order_lines set quantity = 1 where purchase_order_id = $1 returning id",
        [po],
      ),
    );
    expect(rows).toHaveLength(0);
  });

  test("recepción parcial actualiza stock, promedio, último costo y estado", async () => {
    firstReceipt = (await receive(po, [{ line_id: lines[pead]!, quantity: 60 }])).id;
    expect((await getPo(po)).status).toBe("partially_received");
    expect(await item(pead)).toEqual({
      current_stock: "60.000",
      avg_cost: "1000.0000",
      last_purchase_cost: "1000.0000",
    });
  });

  test("no se puede recibir más de lo pedido", async () => {
    await expect(receive(po, [{ line_id: lines[pead]!, quantity: 41 }])).rejects.toThrow(
      "No podés recibir más de lo pedido: quedan 40 kg de PEAD",
    );
  });

  test("recibir el resto deja la orden recibida y una segunda recepción igual falla", async () => {
    const all = [
      { line_id: lines[pead]!, quantity: 40 },
      { line_id: lines[mb]!, quantity: 10 },
    ];
    await receive(po, all);
    expect((await getPo(po)).status).toBe("received");
    await expect(receive(po, all)).rejects.toThrow(/no está pendiente de recepción/);
    expect((await item(pead)).current_stock).toBe("100.000");
  });

  test("anular parte de una recepción revierte stock y estado", async () => {
    const rl = await db.su.one<{ id: string }>(
      "select id from public.purchase_receipt_lines where receipt_id = $1",
      [firstReceipt],
    );
    await db.as(admin, (q) =>
      q.exec("select public.reverse_purchase_receipt($1, $2, 'Vino material fallado')", [
        firstReceipt,
        JSON.stringify([{ receipt_line_id: rl.id, quantity: 20 }]),
      ]),
    );
    expect((await getPo(po)).status).toBe("partially_received");
    expect((await item(pead)).current_stock).toBe("80.000");
    const rev = await db.su.one<{ unit_cost: string; reverses_movement_id: string | null }>(
      "select unit_cost::text, reverses_movement_id from public.stock_movements where movement_type = 'reversal' and item_id = $1",
      [pead],
    );
    expect(rev.unit_cost).toBe("1000.0000");
    expect(rev.reverses_movement_id).not.toBeNull();

    await expect(
      db.as(admin, (q) =>
        q.exec("select public.reverse_purchase_receipt($1, $2, 'Otra vez')", [
          firstReceipt,
          JSON.stringify([{ receipt_line_id: rl.id, quantity: 41 }]),
        ]),
      ),
    ).rejects.toThrow("No podés anular más de lo recibido en esta entrega: quedan 40 kg de PEAD");
  });

  test("cancelar una orden parcialmente recibida la cierra con faltantes", async () => {
    const closed = await db.as(admin, (q) =>
      q.one<Po>("select * from public.cancel_purchase_order($1, 'El proveedor no tiene más')", [
        po,
      ]),
    );
    expect(closed.status).toBe("closed");
  });
});

test("cancelar un borrador lo deja cancelado y una orden recibida no se cancela", async () => {
  const draft = await createPo([{ item: pead, qty: 1, price: 1, rate: 21 }]);
  const c = await db.as(admin, (q) =>
    q.one<Po>("select * from public.cancel_purchase_order($1, 'Ya no hace falta')", [draft]),
  );
  expect(c.status).toBe("cancelled");

  const full = await createPo([{ item: mb, qty: 1, price: 1, rate: 21 }]);
  await confirm(full);
  await receive(full, [{ line_id: (await lineIds(full))[mb]!, quantity: 1 }]);
  await expect(
    db.as(admin, (q) => q.one("select * from public.cancel_purchase_order($1, 'Tarde')", [full])),
  ).rejects.toThrow(/no se puede cancelar/);
});

test("un usuario de otra fábrica no puede confirmar ni recibir órdenes ajenas", async () => {
  const id = await createPo([{ item: pead, qty: 5, price: 10, rate: 21 }]);
  await expect(confirm(id, outsider)).rejects.toMatchObject({ code: "42501" });
  await confirm(id);
  const l = await lineIds(id);
  await expect(receive(id, [{ line_id: l[pead]!, quantity: 5 }], outsider)).rejects.toMatchObject({
    code: "42501",
  });
  const seen = await db.as(outsider, (q) => q.many("select * from public.purchase_orders"));
  expect(seen).toHaveLength(0);
  void orgB;
});

test("invariante: stock = Σ movimientos", async () => {
  const bad = await db.su.many(
    `select i.id from public.items i left join public.stock_movements m on m.item_id = i.id
     group by i.id, i.current_stock having i.current_stock <> coalesce(sum(m.quantity), 0)`,
  );
  expect(bad).toEqual([]);
});
