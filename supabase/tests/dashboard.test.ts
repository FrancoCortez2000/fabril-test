import { createTestDb, type TestDb } from "./db";

// Dashboard: dashboard_data (security invoker) y recent_activity (security definer con guarda).
// La fábrica de prueba es una demo con movimientos en fechas fijas: su "asOf" es la fecha del
// último movimiento (2026-11-10), así que los números no dependen del día en que corre el test.

type Dashboard = {
  asOf: string;
  kpis: {
    products: number;
    rawMaterials: number;
    inventoryValue: number;
    activeOrders: number;
    unitsThisMonth: number;
    unitsSamePeriodLastMonth: number;
  };
  monthlyProduction: { month: string; units: number }[];
  inventoryFlow: { month: string; inValue: number; outValue: number }[];
  alerts: {
    kind: string;
    title: string;
    detail: string;
    entityType: string;
    entityId: string;
    itemType: string | null;
  }[];
};

type Activity = {
  id: string;
  summary: string;
  actor_name: string;
  occurred_at: string;
  entity_type: string;
  entity_id: string | null;
};

let db: TestDb;
let owner: string;
let stranger: string;
let demo: string;
let empty: string;
let aditivo: string;
let colorante: string;
let supplier: string;

const dash = (who: string, org: string) =>
  db.as(who as never, (q) =>
    q.one<{ d: Dashboard }>("select public.dashboard_data($1) as d", [org]).then((r) => r.d),
  );
const activity = (who: string, org: string, limit?: number) =>
  db.as(who as never, (q) =>
    limit === undefined
      ? q.many<Activity>("select * from public.recent_activity($1)", [org])
      : q.many<Activity>("select * from public.recent_activity($1, $2)", [org, limit]),
  );

async function item(
  org: string,
  type: "finished_good" | "raw_material",
  sku: string,
  name: string,
  opts: { min?: number; unit?: number; archived?: boolean } = {},
) {
  const row = await db.su.one<{ id: string }>(
    `insert into public.items (organization_id, type, sku, name, unit_id, min_stock, archived_at)
     values ($1, $2, $3, $4, $5, $6, $7) returning id`,
    [org, type, sku, name, opts.unit ?? 1, opts.min ?? 0, opts.archived ? "2026-06-01" : null],
  );
  return row.id;
}

const move = (org: string, itemId: string, type: string, qty: number, cost: number, at: string) =>
  db.su.exec(
    "select private.insert_movement($1, $2, $3, $4, $5, null, '{}'::jsonb, null, $6::timestamptz)",
    [org, itemId, type, qty, cost, at],
  );

beforeAll(async () => {
  db = await createTestDb();
  owner = await db.createUser("ana@a.com", "Ana María Pérez");
  stranger = await db.createUser("beto@b.com", "Beto");
  demo = await db.createOrg("Demo T", owner, { isDemo: true });
  empty = await db.createOrg("Vacía", stranger);

  const pead = await item(demo, "raw_material", "PEAD", "PEAD");
  colorante = await item(demo, "raw_material", "COL", "Colorante", { min: 100 });
  aditivo = await item(demo, "raw_material", "ADI", "Aditivo", { min: 10 });
  await item(demo, "raw_material", "SAL", "Sal");
  const viejo = await item(demo, "raw_material", "VIE", "Viejo", { archived: true });
  const bidon = await item(demo, "finished_good", "BID", "Bidón", { unit: 3 });

  await move(demo, viejo, "purchase_receipt", 30, 10, "2026-07-01T12:00:00-03:00");
  await move(demo, colorante, "purchase_receipt", 50, 20, "2026-08-15T12:00:00-03:00");
  await move(demo, pead, "purchase_receipt", 100, 50, "2026-09-05T12:00:00-03:00");
  await move(demo, bidon, "production_output", 250, 10, "2026-10-08T12:00:00-03:00");
  await move(demo, bidon, "production_output", 1000, 10, "2026-10-20T12:00:00-03:00");
  await move(demo, pead, "purchase_receipt", 100, 70, "2026-11-02T12:00:00-03:00");
  await move(demo, pead, "production_consumption", -40, 0, "2026-11-03T12:00:00-03:00");
  await move(demo, bidon, "production_output", 400, 10, "2026-11-05T12:00:00-03:00");
  await move(demo, bidon, "production_output", 300, 10, "2026-11-10T12:00:00-03:00");

  const order = (code: string, status: string, end: string) =>
    db.su.exec(
      `insert into public.production_orders (organization_id, code, item_id, status, planned_qty, planned_end_date)
       values ($1, $2, $3, $4, 100, $5::date)`,
      [demo, code, bidon, status, end],
    );
  await order("OP-T-1", "planned", "2026-11-05");
  await order("OP-T-2", "in_progress", "2026-11-30");
  await order("OP-T-3", "completed", "2026-10-01");

  supplier = (
    await db.su.one<{ id: string }>(
      "insert into public.suppliers (organization_id, name) values ($1, 'Plastiqueros S.A.') returning id",
      [demo],
    )
  ).id;
  const po = (code: string, status: string, expected: string) =>
    db.su.exec(
      `insert into public.purchase_orders (organization_id, code, supplier_id, status, expected_date)
       values ($1, $2, $3, $4, $5::date)`,
      [demo, code, supplier, status, expected],
    );
  await po("OC-T-1", "pending", "2026-11-08");
  await po("OC-T-2", "received", "2026-11-01");
  await po("OC-T-3", "pending", "2026-11-20");

  for (let i = 1; i <= 10; i++) {
    await db.su.exec(
      "select private.log_activity($1, $2, 'item', $3, 'test', $4, '{}'::jsonb, $5::timestamptz)",
      [
        demo,
        i === 1 ? null : owner,
        bidon,
        `Prueba ${i}`,
        `2026-11-${String(i).padStart(2, "0")}T10:00:00-03:00`,
      ],
    );
  }
});
afterAll(() => db.close());

describe("dashboard_data de una fábrica con historia", () => {
  let d: Dashboard;
  beforeAll(async () => {
    d = await dash(owner, demo);
  });

  test("asOf de una demo envejecida es la fecha del último movimiento", () => {
    expect(d.asOf).toBe("2026-11-10");
  });

  test("KPIs con números exactos", () => {
    expect(d.kpis).toEqual({
      products: 1,
      rawMaterials: 4,
      inventoryValue: 30100,
      activeOrders: 2,
      unitsThisMonth: 700,
      unitsSamePeriodLastMonth: 250,
    });
  });

  test("producción mensual: 12 meses ordenados terminando en el mes de asOf", () => {
    expect(d.monthlyProduction).toHaveLength(12);
    expect(d.monthlyProduction[0]).toEqual({ month: "2025-12", units: 0 });
    expect(d.monthlyProduction[11]).toEqual({ month: "2026-11", units: 700 });
    expect(d.monthlyProduction.find((m) => m.month === "2026-10")?.units).toBe(1250);
    expect(d.monthlyProduction.map((m) => m.month)).toEqual(
      [...d.monthlyProduction.map((m) => m.month)].sort(),
    );
  });

  test("movimientos valorizados: entradas y salidas por mes", () => {
    expect(d.inventoryFlow).toHaveLength(12);
    const byMonth = Object.fromEntries(d.inventoryFlow.map((m) => [m.month, m]));
    expect(byMonth["2026-07"]).toEqual({ month: "2026-07", inValue: 300, outValue: 0 });
    expect(byMonth["2026-08"]?.inValue).toBe(1000);
    expect(byMonth["2026-09"]?.inValue).toBe(5000);
    expect(byMonth["2026-10"]).toEqual({ month: "2026-10", inValue: 12500, outValue: 0 });
    expect(byMonth["2026-11"]).toEqual({ month: "2026-11", inValue: 14000, outValue: 2400 });
  });

  test("alertas en el orden acordado y sin falsos positivos", () => {
    expect(d.alerts.map((a) => a.kind)).toEqual([
      "out_of_stock",
      "low_stock",
      "delayed_order",
      "late_purchase",
    ]);
    expect(d.alerts[0]).toMatchObject({
      title: "Aditivo sin stock",
      entityType: "item",
      entityId: aditivo,
      itemType: "raw_material",
    });
    expect(d.alerts[1]).toMatchObject({
      title: "Colorante con stock bajo",
      entityId: colorante,
      itemType: "raw_material",
    });
    expect(d.alerts[2]).toMatchObject({
      title: "OP-T-1 demorada",
      entityType: "production_order",
      itemType: null,
    });
    expect(d.alerts[3]).toMatchObject({
      title: expect.stringMatching(/^OC-\d{4}-\d{4} con entrega vencida$/),
      entityType: "purchase_order",
      itemType: null,
    });
    expect(d.alerts[3]?.detail).toContain("Plastiqueros S.A.");
  });
});

describe("dashboard_data de una fábrica vacía o ajena", () => {
  test("una fábrica sin movimientos no tiene NaN, null ni alertas", async () => {
    const d = await dash(stranger, empty);
    expect(d.kpis).toEqual({
      products: 0,
      rawMaterials: 0,
      inventoryValue: 0,
      activeOrders: 0,
      unitsThisMonth: 0,
      unitsSamePeriodLastMonth: 0,
    });
    expect(d.monthlyProduction).toHaveLength(12);
    expect(d.monthlyProduction.every((m) => m.units === 0)).toBe(true);
    expect(d.inventoryFlow.every((m) => m.inValue === 0 && m.outValue === 0)).toBe(true);
    expect(d.alerts).toEqual([]);
    expect(d.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("pedir la fábrica de otro devuelve todo vacío, nunca sus datos", async () => {
    const d = await dash(stranger, demo);
    expect(d.kpis.inventoryValue).toBe(0);
    expect(d.kpis.products).toBe(0);
    expect(d.alerts).toEqual([]);
    expect(await activity(stranger, demo)).toEqual([]);
  });

  test("anon no obtiene nada si no hay demo pública", async () => {
    const d = await dash("anon", demo);
    expect(d.kpis.inventoryValue).toBe(0);
    expect(await activity("anon", demo)).toEqual([]);
  });
});

describe("recent_activity", () => {
  test("máximo 8 por defecto, de la más nueva a la más vieja", async () => {
    const rows = await activity(owner, demo);
    expect(rows).toHaveLength(8);
    const times = rows.map((r) => new Date(r.occurred_at).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  test("el límite se respeta y se acota a 50", async () => {
    expect(await activity(owner, demo, 3)).toHaveLength(3);
    const all = await activity(owner, demo, 1000);
    expect(all.length).toBeGreaterThanOrEqual(10);
    expect(all.length).toBeLessThanOrEqual(50);
  });

  test("el actor sale como primer nombre y 'Sistema' si no hay actor", async () => {
    const rows = await activity(owner, demo, 50);
    expect(rows.find((r) => r.summary === "Prueba 2")?.actor_name).toBe("Ana");
    expect(rows.find((r) => r.summary === "Prueba 1")?.actor_name).toBe("Sistema");
  });
});

describe("con la demo pública", () => {
  beforeAll(async () => {
    await db.as("service", (q) => q.exec("select public.admin_set_public_demo($1)", [demo]));
  });

  test("anon recibe los datos de la demo pública", async () => {
    const d = await dash("anon", demo);
    expect(d.kpis.inventoryValue).toBe(30100);
    expect(d.alerts).toHaveLength(4);
    expect((await activity("anon", demo)).length).toBe(8);
  });

  test("la demo pública no muestra quién hizo cada cosa: todo sale como Equipo", async () => {
    const asAnon = await activity("anon", demo, 50);
    expect(asAnon.length).toBeGreaterThan(8);
    expect(asAnon.every((r) => r.actor_name === "Equipo")).toBe(true);
    // Un usuario logueado que no es de esa fábrica tampoco ve nombres.
    const asStranger = await activity(stranger, demo, 50);
    expect(asStranger.every((r) => r.actor_name === "Equipo")).toBe(true);
  });

  test("un miembro de la fábrica sigue viendo los nombres reales", async () => {
    const rows = await activity(owner, demo, 50);
    expect(rows.find((r) => r.summary === "Prueba 2")?.actor_name).toBe("Ana");
    expect(rows.find((r) => r.summary === "Prueba 1")?.actor_name).toBe("Sistema");
  });

  test("anon no recibe nada de otra fábrica", async () => {
    const d = await dash("anon", empty);
    expect(d.kpis.products).toBe(0);
    expect(await activity("anon", empty)).toEqual([]);
  });
});
