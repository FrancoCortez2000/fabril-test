import { createTestDb, type TestDb } from "./db";

// Reglas de catálogo: guarda de unidad, zona horaria válida, save_bom e item_costing.

let db: TestDb;
let admin: string;
let stranger: string;
let org: string;
let orgB: string;
let pead: string;
let mb: string;
let product: string;
let productB: string;
let other: string;

const ins = (sql: string, p: unknown[]) => db.su.one<{ id: string }>(sql, p).then((r) => r.id);
const item = (o: string, type: string, sku: string, unit: number) =>
  ins(
    `insert into public.items (organization_id, type, sku, name, unit_id)
     values ($1, $2, $3, $3, $4) returning id`,
    [o, type, sku, unit],
  );

const saveBom = (
  who: string,
  itemId: string,
  lines: unknown[],
  opts: { out?: number; waste?: number | null; notes?: string | null } = {},
) =>
  db.as(who as never, (q) =>
    q
      .one<{ id: string }>("select public.save_bom($1, $2, $3, $4, $5::jsonb) as id", [
        itemId,
        opts.out ?? 1,
        opts.waste ?? null,
        opts.notes ?? null,
        JSON.stringify(lines),
      ])
      .then((r) => r.id),
  );

beforeAll(async () => {
  db = await createTestDb();
  admin = await db.createUser("ana@a.com");
  stranger = await db.createUser("beto@b.com");
  org = await db.createOrg("Demo A", admin, { isDemo: true });
  orgB = await db.createOrg("Fábrica B", stranger);
  await db.su.exec(
    "update public.organizations set default_labor_rate = 6000, default_waste_pct = 3 where id = $1",
    [org],
  );
  pead = await item(org, "raw_material", "PEAD", 1);
  mb = await item(org, "raw_material", "MB-AZ", 1);
  other = await item(org, "raw_material", "OTRO", 1);
  product = await ins(
    `insert into public.items (organization_id, type, sku, name, unit_id, standard_labor_minutes, overhead_per_unit)
     values ($1, 'finished_good', 'BID-5L', 'Bidón 5 L', 3, 15, 20) returning id`,
    [org],
  );
  productB = await item(orgB, "finished_good", "B-1", 3);
  await db.su.exec(
    "select private.insert_movement($1, $2, 'purchase_receipt', 300, 1000, null, '{}'::jsonb, null, now())",
    [org, pead],
  );
  await db.su.exec(
    "select private.insert_movement($1, $2, 'purchase_receipt', 10, 8000, null, '{}'::jsonb, null, now())",
    [org, mb],
  );
});
afterAll(() => db.close());

describe("guarda de unidad", () => {
  test("sin movimientos la unidad se puede cambiar", async () => {
    await db.as(admin, (q) => q.exec("update public.items set unit_id = 2 where id = $1", [other]));
    const row = await db.su.one<{ unit_id: number }>(
      "select unit_id from public.items where id = $1",
      [other],
    );
    expect(row.unit_id).toBe(2);
  });

  test("con movimientos la unidad no se puede cambiar", async () => {
    await expect(
      db.as(admin, (q) => q.exec("update public.items set unit_id = 2 where id = $1", [pead])),
    ).rejects.toThrow(/No se puede cambiar la unidad de un ítem con movimientos/);
  });

  test("con movimientos se pueden editar los demás campos y repetir la misma unidad", async () => {
    await db.as(admin, (q) =>
      q.exec("update public.items set name = 'PEAD virgen', unit_id = 1 where id = $1", [pead]),
    );
    const row = await db.su.one<{ name: string }>("select name from public.items where id = $1", [
      pead,
    ]);
    expect(row.name).toBe("PEAD virgen");
  });
});

describe("zona horaria", () => {
  test("acepta una zona válida", async () => {
    await db.as(admin, (q) =>
      q.exec(
        "update public.organizations set timezone = 'America/Argentina/Cordoba' where id = $1",
        [org],
      ),
    );
    await db.as(admin, (q) =>
      q.exec(
        "update public.organizations set timezone = 'America/Argentina/Buenos_Aires' where id = $1",
        [org],
      ),
    );
  });

  test("rechaza una zona inventada", async () => {
    await expect(
      db.as(admin, (q) =>
        q.exec("update public.organizations set timezone = 'Marte/Olimpo' where id = $1", [org]),
      ),
    ).rejects.toThrow(/Zona horaria inválida/);
  });
});

describe("save_bom", () => {
  const lines = (...pairs: [string, number, number | null][]) =>
    pairs.map(([componentItemId, quantity, wastePct]) => ({ componentItemId, quantity, wastePct }));

  test("crea la receta con las líneas en orden", async () => {
    const bom = await saveBom(admin, product, lines([pead, 0.25, null], [mb, 0.005, 5]), {
      out: 1,
      notes: "v1",
    });
    const rows = await db.su.many<{
      component_item_id: string;
      position: number;
      waste_pct: string | null;
    }>(
      "select component_item_id, position, waste_pct::text from public.bom_lines where bom_id = $1 order by position",
      [bom],
    );
    expect(rows.map((r) => [r.component_item_id, r.position, r.waste_pct])).toEqual([
      [pead, 0, null],
      [mb, 1, "5.00"],
    ]);
  });

  test("es idempotente y reemplaza las líneas anteriores", async () => {
    const first = await saveBom(admin, product, lines([pead, 0.25, null], [mb, 0.005, 5]));
    const again = await saveBom(admin, product, lines([mb, 0.01, null]), { out: 10, waste: 2 });
    expect(again).toBe(first);
    const bom = await db.su.one<{ output_qty: string; default_waste_pct: string }>(
      "select output_qty::text, default_waste_pct::text from public.boms where id = $1",
      [first],
    );
    expect(bom).toEqual({ output_qty: "10.000", default_waste_pct: "2.00" });
    const rows = await db.su.many<{ component_item_id: string }>(
      "select component_item_id from public.bom_lines where bom_id = $1",
      [first],
    );
    expect(rows.map((r) => r.component_item_id)).toEqual([mb]);
    // se deja la receta de referencia para los demás tests
    await saveBom(admin, product, lines([pead, 0.25, null], [mb, 0.005, null]));
  });

  test("registra la actividad", async () => {
    const log = await db.su.many<{ summary: string }>(
      "select summary from public.activity_log where entity_id = $1 and action = 'bom_saved'",
      [product],
    );
    expect(log.length).toBeGreaterThan(0);
    expect(log[0]?.summary).toBe("Actualizó la receta de Bidón 5 L");
  });

  test.each([
    ["lista vacía", () => [], /al menos una materia prima/],
    ["componente repetido", () => lines([pead, 1, null], [pead, 2, null]), /No repitas/],
    ["cantidad cero", () => lines([pead, 0, null]), /cantidad/],
    ["desperdicio fuera de rango", () => lines([pead, 1, 101]), /desperdicio/],
    ["componente que no es materia prima", () => lines([product, 1, null]), /materia prima/],
    ["componente de otra fábrica", () => lines([productB, 1, null]), /materia prima/],
  ])("rechaza %s", async (_name, make, message) => {
    await expect(saveBom(admin, product, make() as never[])).rejects.toThrow(message);
  });

  test("rechaza un rendimiento nulo o un desperdicio por defecto inválido", async () => {
    await expect(saveBom(admin, product, lines([pead, 1, null]), { out: 0 })).rejects.toThrow(
      /rendimiento/,
    );
    await expect(saveBom(admin, product, lines([pead, 1, null]), { waste: 150 })).rejects.toThrow(
      /desperdicio/,
    );
  });

  test("rechaza ítems que no son productos terminados", async () => {
    await expect(saveBom(admin, pead, lines([mb, 1, null]))).rejects.toThrow(/producto terminado/);
  });

  test("un usuario de otra fábrica y anon no pueden", async () => {
    await expect(saveBom(stranger, product, lines([pead, 1, null]))).rejects.toThrow(
      /No tenés permiso/,
    );
    await expect(saveBom("anon", product, lines([pead, 1, null]))).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe("item_costing", () => {
  test("coincide exactamente con el costo planificado de una orden de 1 unidad", async () => {
    const costing = await db.as(admin, (q) =>
      q.one<Record<string, string>>(
        "select materials_cost::text, labor_cost::text, overhead_cost::text, standard_cost::text from public.item_costing where item_id = $1",
        [product],
      ),
    );
    expect(costing).toEqual({
      materials_cost: "298.00",
      labor_cost: "1500.00",
      overhead_cost: "20.00",
      standard_cost: "1818.00",
    });

    const order = await db.as(admin, (q) =>
      q.one<Record<string, string>>(
        `select planned_material_cost::text, planned_labor_cost::text, planned_overhead_cost::text
           from public.create_production_order($1, 1, null, null, 'normal', null, '{}', null)`,
        [product],
      ),
    );
    expect(order).toEqual({
      planned_material_cost: costing.materials_cost,
      planned_labor_cost: costing.labor_cost,
      planned_overhead_cost: costing.overhead_cost,
    });
  });

  test("sólo hay filas para productos terminados", async () => {
    const rows = await db.as(admin, (q) =>
      q.many<{ item_id: string }>("select item_id from public.item_costing"),
    );
    expect(rows.map((r) => r.item_id)).toEqual([product]);
  });

  test("una fábrica ajena no ve el costo de otra", async () => {
    const rows = await db.as(stranger, (q) =>
      q.many<{ item_id: string }>("select item_id from public.item_costing where item_id = $1", [
        product,
      ]),
    );
    expect(rows).toEqual([]);
  });

  test("anon lo lee para la demo pública", async () => {
    await db.as("service", (q) => q.exec("select public.admin_set_public_demo($1)", [org]));
    const rows = await db.as("anon", (q) =>
      q.many<{ standard_cost: string }>(
        "select standard_cost::text from public.item_costing where item_id = $1",
        [product],
      ),
    );
    expect(rows).toEqual([{ standard_cost: "1818.00" }]);
  });
});

describe("item_costing sin receta", () => {
  test("un producto sin receta no tiene costo estándar (no es cero)", async () => {
    const bare = await ins(
      `insert into public.items (organization_id, type, sku, name, unit_id, sale_price)
       values ($1, 'finished_good', 'SIN-REC', 'Sin receta', 3, 1000) returning id`,
      [org],
    );
    const row = await db.as(admin, (q) =>
      q.one<{ materials_cost: string | null; standard_cost: string | null }>(
        "select materials_cost::text, standard_cost::text from public.item_costing where item_id = $1",
        [bare],
      ),
    );
    expect(row.standard_cost).toBeNull();
    expect(row.materials_cost).toBeNull();
    const catalog = await db.as(admin, (q) =>
      q.one<{ cost: string | null }>("select cost::text from public.item_catalog where id = $1", [bare]),
    );
    expect(catalog.cost).toBeNull();
  });
});
