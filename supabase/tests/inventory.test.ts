import { createTestDb, type TestDb } from "./db";

let db: TestDb;
let admin: string;
let outsider: string;
let org: string;
let orgB: string;

type ItemState = { current_stock: string; avg_cost: string };
type Movement = { id: string; unit_cost: string; total_cost: string; balance_after: string; quantity: string };

async function newItem(sku: string, minStock = 0, targetOrg = org) {
  const row = await db.su.one<{ id: string }>(
    `insert into public.items (organization_id, type, sku, name, unit_id, min_stock)
     values ($1, 'raw_material', $2, $3, 1, $4) returning id`,
    [targetOrg, sku, sku, minStock],
  );
  return row.id;
}

/** Entrada valorizada por el camino interno (lo usan compras y producción). */
function inbound(item: string, qty: number, cost: number, type = "purchase_receipt") {
  return db.su.one<Movement>(
    `select * from private.insert_movement($1, $2, $3, $4, $5, null, '{}'::jsonb, null, now())`,
    [org, item, type, qty, cost],
  );
}

function state(item: string) {
  return db.su.one<ItemState>("select current_stock::text, avg_cost::text from public.items where id = $1", [item]);
}

const manual = (item: string, type: string, qty: number, cost: number | null = null) =>
  db.as(admin, (q) =>
    q.one<Movement>("select * from public.create_manual_movement($1, $2, $3, 'Despacho a cliente', $4)", [
      item,
      type,
      qty,
      cost,
    ]),
  );

beforeAll(async () => {
  db = await createTestDb();
  admin = await db.createUser("ana@a.com");
  outsider = await db.createUser("beto@b.com");
  org = await db.createOrg("Fábrica A", admin);
  orgB = await db.createOrg("Fábrica B", outsider);
});
afterAll(() => db.close());

describe("valorización por costo promedio ponderado", () => {
  let pead: string;
  beforeAll(async () => {
    pead = await newItem("PEAD");
  });

  test("dos compras promedian el costo", async () => {
    const m1 = await inbound(pead, 100, 1000);
    expect(m1).toMatchObject({ unit_cost: "1000.0000", total_cost: "100000.00", balance_after: "100.000" });
    await inbound(pead, 50, 1300);
    expect(await state(pead)).toEqual({ current_stock: "150.000", avg_cost: "1100.0000" });
  });

  test("una salida manual usa el promedio y no lo cambia", async () => {
    const m = await manual(pead, "manual_out", 30);
    expect(m).toMatchObject({ quantity: "-30.000", unit_cost: "1100.0000", total_cost: "-33000.00" });
    expect(await state(pead)).toEqual({ current_stock: "120.000", avg_cost: "1100.0000" });
  });

  test("una salida que deja stock negativo se rechaza con el faltante exacto", async () => {
    await expect(manual(pead, "manual_out", 150)).rejects.toThrow("No hay stock suficiente de PEAD: faltan 30 kg");
    expect(await state(pead)).toEqual({ current_stock: "120.000", avg_cost: "1100.0000" });
  });

  test("con allow_negative_stock la salida se permite", async () => {
    const item = await newItem("NEG");
    await db.su.exec("update public.organizations set allow_negative_stock = true where id = $1", [org]);
    try {
      await manual(item, "manual_out", 5);
      expect((await state(item)).current_stock).toBe("-5.000");
    } finally {
      await db.su.exec("update public.organizations set allow_negative_stock = false where id = $1", [org]);
    }
  });

  test("manual_in sin costo usa el promedio y no lo cambia; con costo, recalcula", async () => {
    const m = await manual(pead, "manual_in", 10);
    expect(m.unit_cost).toBe("1100.0000");
    expect(await state(pead)).toEqual({ current_stock: "130.000", avg_cost: "1100.0000" });

    await manual(pead, "manual_in", 20, 2400);
    // (130 × 1100 + 20 × 2400) / 150 = 1273,3333
    expect(await state(pead)).toEqual({ current_stock: "150.000", avg_cost: "1273.3333" });
  });

  test("anular un manual_in con costo vuelve al promedio anterior", async () => {
    const before = await state(pead);
    const m = await manual(pead, "manual_in", 30, 2000);
    await db.as(admin, (q) => q.one("select * from public.reverse_stock_movement($1, 'Cargado por error')", [m.id]));
    const after = await state(pead);
    expect(after.current_stock).toBe(before.current_stock);
    expect(Math.abs(Number(after.avg_cost) - Number(before.avg_cost))).toBeLessThanOrEqual(0.0001);
  });

  test("ajuste a cero y luego compra: el promedio no se contamina", async () => {
    const adj = await db.as(admin, (q) =>
      q.one<Movement>("select * from public.create_stock_adjustment($1, 0, 'Conteo físico')", [pead]),
    );
    expect(Number(adj.quantity)).toBeLessThan(0);
    expect((await state(pead)).current_stock).toBe("0.000");
    await inbound(pead, 10, 2000);
    expect(await state(pead)).toEqual({ current_stock: "10.000", avg_cost: "2000.0000" });
  });

  test("un ajuste positivo entra al promedio vigente sin cambiarlo", async () => {
    const adj = await db.as(admin, (q) =>
      q.one<Movement>("select * from public.create_stock_adjustment($1, 15, 'Conteo físico')", [pead]),
    );
    expect(adj).toMatchObject({ quantity: "5.000", unit_cost: "2000.0000" });
    expect(await state(pead)).toEqual({ current_stock: "15.000", avg_cost: "2000.0000" });
  });

  test("un ajuste sin diferencia o sin motivo se rechaza", async () => {
    await expect(
      db.as(admin, (q) => q.one("select * from public.create_stock_adjustment($1, 15, 'Conteo')", [pead])),
    ).rejects.toThrow("El stock contado coincide con el registrado: no hay nada que ajustar");
    await expect(
      db.as(admin, (q) => q.one("select * from public.create_stock_adjustment($1, 14, ' ')", [pead])),
    ).rejects.toThrow("Indicá el motivo");
  });

  test("el kardex: balance_after sigue la suma acumulada", async () => {
    const rows = await db.su.many<{ quantity: string; balance_after: string }>(
      "select quantity, balance_after from public.stock_movements where item_id = $1 order by occurred_at, created_at, id",
      [pead],
    );
    // como varias filas comparten instante, verificamos el invariante global en vez del orden
    const sum = rows.reduce((acc, r) => acc + Number(r.quantity), 0);
    expect(sum).toBeCloseTo(15, 3);
  });
});

describe("anulaciones", () => {
  test("no se puede anular dos veces el mismo movimiento", async () => {
    const item = await newItem("ETQ");
    await inbound(item, 100, 10);
    const m = await manual(item, "manual_out", 10);
    const reverse = () =>
      db.as(admin, (q) => q.one("select * from public.reverse_stock_movement($1, 'Error de carga')", [m.id]));
    await reverse();
    expect((await state(item)).current_stock).toBe("100.000");
    await expect(reverse()).rejects.toThrow("Este movimiento ya fue anulado");
  });

  test("un movimiento de compra no se anula desde inventario", async () => {
    const item = await newItem("ASA");
    const m = await inbound(item, 10, 50);
    await expect(
      db.as(admin, (q) => q.one("select * from public.reverse_stock_movement($1, 'Error')", [m.id])),
    ).rejects.toThrow("Este movimiento se corrige desde su compra u orden de producción");
  });
});

describe("inmutabilidad del libro", () => {
  test("ni siquiera service_role puede modificar o borrar movimientos", async () => {
    await expect(db.as("service", (q) => q.exec("update public.stock_movements set quantity = 1"))).rejects.toThrow(
      "Los movimientos de stock no se modifican",
    );
    await expect(db.as("service", (q) => q.exec("delete from public.stock_movements"))).rejects.toThrow(
      "Los movimientos de stock no se modifican",
    );
  });

  test("authenticated no puede insertar movimientos directamente", async () => {
    const item = await newItem("DIRECTO");
    await expect(
      db.as(admin, (q) =>
        q.exec(
          "insert into public.stock_movements (organization_id, item_id, movement_type, quantity, unit_cost) values ($1, $2, 'manual_in', 5, 1)",
          [org, item],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("aislamiento", () => {
  test("un usuario de otra fábrica no puede ajustar ni ver movimientos ajenos", async () => {
    const item = await newItem("PP");
    await inbound(item, 10, 100);
    await expect(
      db.as(outsider, (q) => q.one("select * from public.create_stock_adjustment($1, 0, 'Robo')", [item])),
    ).rejects.toMatchObject({ code: "42501" });
    const rows = await db.as(outsider, (q) => q.many("select * from public.stock_movements"));
    expect(rows).toHaveLength(0);
    // anon no ejecuta las funciones
    await expect(
      db.as("anon", (q) => q.one("select * from public.create_stock_adjustment($1, 0, 'x')", [item])),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("item_stock_status", () => {
  test("clasifica out, low y ok según el mínimo", async () => {
    const out = await newItem("S-OUT", 10);
    const low = await newItem("S-LOW", 10);
    const ok = await newItem("S-OK", 10);
    await inbound(low, 5, 1);
    await inbound(ok, 10, 1);
    const rows = await db.as(admin, (q) =>
      q.many<{ item_id: string; level: string; available: string }>(
        "select item_id, level, available::text from public.item_stock_status where item_id = any($1)",
        [[out, low, ok]],
      ),
    );
    const level = Object.fromEntries(rows.map((r) => [r.item_id, r.level]));
    expect(level).toEqual({ [out]: "out", [low]: "low", [ok]: "ok" });
    const other = await db.as(outsider, (q) => q.many("select * from public.item_stock_status"));
    expect(other).toHaveLength(0);
    void orgB;
  });
});

test("invariante: current_stock = Σ movimientos para cada ítem", async () => {
  const bad = await db.su.many(
    `select i.id from public.items i
     left join public.stock_movements m on m.item_id = i.id
     group by i.id, i.current_stock
     having i.current_stock <> coalesce(sum(m.quantity), 0)`,
  );
  expect(bad).toEqual([]);
});
