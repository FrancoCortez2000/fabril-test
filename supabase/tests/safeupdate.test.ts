import { createTestDb, type TestDb } from "./db";

// Supabase activa la extensión safeupdate para las llamadas por la API: un UPDATE o DELETE sin WHERE
// falla con "UPDATE requires a WHERE clause", incluso dentro de funciones y sobre tablas temporales.
// PGlite no la trae, así que lo verificamos leyendo el código de cada función.

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});
afterAll(() => db.close());

function statementsWithoutWhere(source: string): string[] {
  const code = source
    .replace(/--[^\n]*/g, " ")
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/\s+/g, " ");
  return code
    .split(";")
    .map((s) => s.trim())
    .map((s) => s.replace(/^(?:.*\b(?:then|else|loop|begin)\s+)?/i, ""))
    .filter((s) => /^(update|delete from)\s/i.test(s))
    .filter((s) => !/\bwhere\b/i.test(s));
}

test("ninguna función hace UPDATE o DELETE sin WHERE (safeupdate de Supabase)", async () => {
  const fns = await db.su.many<{ name: string; src: string }>(
    `select n.nspname || '.' || p.proname as name, p.prosrc as src
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'private')`,
  );
  expect(fns.length).toBeGreaterThan(20);
  const offenders = fns.flatMap((f) =>
    statementsWithoutWhere(f.src).map((s) => `${f.name}: ${s.slice(0, 80)}`),
  );
  expect(offenders).toEqual([]);
});

test("el detector reconoce los casos que safeupdate rechaza", () => {
  expect(statementsWithoutWhere("begin update t set a = 1; end")).toHaveLength(1);
  expect(statementsWithoutWhere("delete from pg_temp.x;")).toHaveLength(1);
  expect(statementsWithoutWhere("update t set a = 1 where true;")).toHaveLength(0);
  expect(statementsWithoutWhere("if x then delete from t where id = 1; end if;")).toHaveLength(0);
  // INSERT ... ON CONFLICT DO UPDATE es un INSERT: safeupdate no lo controla.
  expect(
    statementsWithoutWhere("insert into t values (1) on conflict (id) do update set a = 2;"),
  ).toHaveLength(0);
});
