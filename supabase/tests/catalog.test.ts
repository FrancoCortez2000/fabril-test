import { calculateMaterialRequirements } from "@/features/production/logic";

import { createTestDb, type Query, type TestDb } from "./db";

let db: TestDb;
let userA: string;
let userB: string;
let orgA: string;
let orgB: string;
let kg: number;
let u: number;

type ItemInput = {
  org: string;
  type: "finished_good" | "raw_material";
  sku: string;
  name: string;
  unit?: number;
};

function insertItem(q: Query, i: ItemInput) {
  return q
    .one<{ id: string }>(
      `insert into public.items (organization_id, type, sku, name, unit_id)
       values ($1, $2, $3, $4, $5) returning id`,
      [i.org, i.type, i.sku, i.name, i.unit ?? kg],
    )
    .then((r) => r.id);
}

beforeAll(async () => {
  db = await createTestDb();
  userA = await db.createUser("ana@a.com");
  userB = await db.createUser("beto@b.com");
  orgA = await db.createOrg("Fábrica A", userA);
  orgB = await db.createOrg("Fábrica B", userB);
  kg = (await db.su.one<{ id: number }>("select id from public.units where code = 'kg'")).id;
  u = (await db.su.one<{ id: number }>("select id from public.units where code = 'u'")).id;
});
afterAll(() => db.close());

test("las unidades del sistema están sembradas y son de sólo lectura", async () => {
  const codes = await db.as(userA, (q) =>
    q.many<{ code: string }>("select code from public.units order by id"),
  );
  expect(codes.map((c) => c.code)).toEqual(["kg", "g", "u", "l", "ml", "m", "m2"]);
  await expect(db.as(userA, (q) => q.exec("update public.units set name = 'x'"))).rejects.toThrow(
    /permission denied/,
  );
});

test("un admin crea un ítem y queda registrado en la actividad", async () => {
  const id = await db.as(userA, (q) =>
    insertItem(q, {
      org: orgA,
      type: "finished_good",
      sku: "BID-5L-AZ",
      name: "Bidón 5 L azul",
      unit: u,
    }),
  );
  const log = await db.as(userA, (q) =>
    q.one<{ summary: string; actor_id: string }>(
      "select summary, actor_id from public.activity_log where entity_id = $1",
      [id],
    ),
  );
  expect(log).toEqual({ summary: "Creó el producto Bidón 5 L azul", actor_id: userA });
});

test("un usuario de otra fábrica no puede crear ítems en la ajena", async () => {
  await expect(
    db.as(userB, (q) =>
      insertItem(q, { org: orgA, type: "raw_material", sku: "X-1", name: "Intruso" }),
    ),
  ).rejects.toThrow(/row-level security/);
});

test("current_stock y avg_cost no se pueden editar", async () => {
  await db.as(userA, (q) =>
    insertItem(q, { org: orgA, type: "raw_material", sku: "PEAD", name: "PEAD" }),
  );
  await expect(
    db.as(userA, (q) => q.exec("update public.items set current_stock = 999 where sku = 'PEAD'")),
  ).rejects.toThrow(/permission denied/);
  await expect(
    db.as(userA, (q) => q.exec("update public.items set avg_cost = 1 where sku = 'PEAD'")),
  ).rejects.toThrow(/permission denied/);
});

test("al crear un ítem no se puede inventar stock, costo ni autor", async () => {
  for (const [col, value] of [
    ["current_stock", 500],
    ["avg_cost", 99],
    ["last_purchase_cost", 99],
    ["created_by", userB],
  ] as const) {
    await expect(
      db.as(userA, (q) =>
        q.exec(
          `insert into public.items (organization_id, type, sku, name, unit_id, ${col}) values ($1, 'raw_material', $2, 'Trucho', $3, $4)`,
          [orgA, `TRUCHO-${col}`, kg, value],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  }
});

test("el SKU es único por fábrica sin distinguir mayúsculas", async () => {
  await db.as(userA, (q) =>
    insertItem(q, { org: orgA, type: "raw_material", sku: "MB-AZ", name: "Masterbatch" }),
  );
  await expect(
    db.as(userA, (q) =>
      insertItem(q, { org: orgA, type: "raw_material", sku: "mb-az", name: "Otro" }),
    ),
  ).rejects.toMatchObject({ code: "23505" });
  const other = await db.as(userB, (q) =>
    insertItem(q, { org: orgB, type: "raw_material", sku: "MB-AZ", name: "Masterbatch B" }),
  );
  expect(other).toBeTruthy();
});

test("cada fábrica ve sólo sus ítems y anon no ve nada", async () => {
  const skus = await db.as(userB, (q) => q.many<{ sku: string }>("select sku from public.items"));
  expect(skus.map((s) => s.sku)).toEqual(["MB-AZ"]);
  expect(await db.as("anon", (q) => q.many("select * from public.items"))).toEqual([]);
});

describe("recetas", () => {
  let product: string;
  let pead: string;
  let finished2: string;
  let foreignRaw: string;
  let bom: string;

  beforeAll(async () => {
    await db.as(userA, async (q) => {
      product = await insertItem(q, {
        org: orgA,
        type: "finished_good",
        sku: "BAL-10",
        name: "Balde 10 L",
        unit: u,
      });
      finished2 = await insertItem(q, {
        org: orgA,
        type: "finished_good",
        sku: "TAPA",
        name: "Tapa",
        unit: u,
      });
      pead = (await q.one<{ id: string }>("select id from public.items where sku = 'PEAD'")).id;
    });
    foreignRaw = await db.as(userB, (q) =>
      insertItem(q, { org: orgB, type: "raw_material", sku: "PP-B", name: "PP B" }),
    );
    bom = await db.as(userA, (q) =>
      q
        .one<{ id: string }>(
          "insert into public.boms (organization_id, item_id) values ($1, $2) returning id",
          [orgA, product],
        )
        .then((r) => r.id),
    );
  });

  const addLine = (who: string, component: string) =>
    db.as(who, (q) =>
      q.exec(
        "insert into public.bom_lines (organization_id, bom_id, component_item_id, quantity) values ($1, $2, $3, 0.25)",
        [orgA, bom, component],
      ),
    );

  test("acepta una materia prima de la misma fábrica", async () => {
    await addLine(userA, pead);
    const lines = await db.as(userA, (q) =>
      q.many("select * from public.bom_lines where bom_id = $1", [bom]),
    );
    expect(lines).toHaveLength(1);
  });

  test("rechaza un componente que es producto terminado", async () => {
    await expect(addLine(userA, finished2)).rejects.toThrow(
      "El componente tiene que ser una materia prima",
    );
  });

  test("rechaza el propio producto como componente", async () => {
    await expect(addLine(userA, product)).rejects.toThrow(
      "El componente tiene que ser una materia prima",
    );
  });

  test("rechaza un componente de otra fábrica", async () => {
    await expect(addLine(userA, foreignRaw)).rejects.toMatchObject({ code: "23503" });
  });

  test("rechaza una receta para una materia prima", async () => {
    await expect(
      db.as(userA, (q) =>
        q.exec("insert into public.boms (organization_id, item_id) values ($1, $2)", [orgA, pead]),
      ),
    ).rejects.toThrow("La receta tiene que ser de un producto terminado");
  });

  test("otra fábrica no ve las recetas ni sus líneas", async () => {
    const rows = await db.as(userB, (q) => q.many("select * from public.bom_lines"));
    expect(rows).toHaveLength(0);
  });
});

test("archivar un ítem queda en la actividad", async () => {
  await db.as(userA, (q) =>
    q.exec("update public.items set archived_at = now() where sku = 'PEAD'"),
  );
  const log = await db.su.one<{ summary: string }>(
    "select summary from public.activity_log where action = 'archived' and summary like '%PEAD%'",
  );
  expect(log.summary).toBe("Archivó la materia prima PEAD");
});

describe("paridad del cálculo de materiales (SQL vs TypeScript)", () => {
  const cases = [
    { planned: 1000, qty: 0.25, output: 1, waste: 3 },
    { planned: 1000, qty: 2.5, output: 10, waste: 0 },
    { planned: 3, qty: 0.3333, output: 1, waste: 3 },
    { planned: 1000, qty: 1, output: 1, waste: 0 },
    { planned: 777, qty: 0.0125, output: 4, waste: 7.5 },
  ];
  test.each(cases)(
    "$planned × $qty / $output con $waste %",
    async ({ planned, qty, output, waste }) => {
      const [ts] = calculateMaterialRequirements({
        plannedQty: planned,
        outputQty: output,
        defaultWastePct: waste,
        lines: [{ itemId: "x", name: "x", unitCode: "kg", quantity: qty, wastePct: null }],
        stock: {},
      });
      const sql = await db.su.one<{ r: string }>(
        "select private.bom_requirement($1, $2, $3, $4)::text as r",
        [planned, qty, output, waste],
      );
      expect(Number(sql.r)).toBe(ts?.required);
    },
  );
});
