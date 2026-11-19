import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { PGlite, type Transaction } from "@electric-sql/pglite";

const SUPABASE_DIR = path.resolve(__dirname, "..");
const MIGRATIONS_DIR = path.join(SUPABASE_DIR, "migrations");

type Executor = Pick<PGlite | Transaction, "query" | "exec">;

export type Query = {
  many<R = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<R[]>;
  one<R = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<R>;
  exec(sql: string, params?: unknown[]): Promise<void>;
};

export type Actor = string | "anon" | "service";

export type TestDb = {
  pg: PGlite;
  /** Conexión de superusuario (equivale a correr SQL como dueño de la base). */
  su: Query;
  /** Ejecuta `fn` en una transacción con el rol y los claims de `who`. Si `fn` lanza, revierte. */
  as<T>(who: Actor, fn: (q: Query) => Promise<T>): Promise<T>;
  createUser(email: string, fullName?: string): Promise<string>;
  createOrg(name: string, adminUserId: string, opts?: { isDemo?: boolean }): Promise<string>;
  close(): Promise<void>;
};

function makeQuery(ex: Executor): Query {
  return {
    async many<R>(sql: string, params: unknown[] = []) {
      const res = await ex.query<R>(sql, params);
      return res.rows;
    },
    async one<R>(sql: string, params: unknown[] = []) {
      const res = await ex.query<R>(sql, params);
      if (res.rows.length !== 1) {
        throw new Error(`Se esperaba 1 fila y llegaron ${res.rows.length}: ${sql}`);
      }
      return res.rows[0] as R;
    },
    async exec(sql: string, params: unknown[] = []) {
      if (params.length) await ex.query(sql, params);
      else await ex.exec(sql);
    },
  };
}

export function migrationFiles(): string[] {
  let names: string[] = [];
  try {
    names = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));
  } catch {
    return [];
  }
  return names.sort().map((f) => path.join(MIGRATIONS_DIR, f));
}

const ROLE: Record<"anon" | "service", string> = { anon: "anon", service: "service_role" };

export async function createTestDb(): Promise<TestDb> {
  const pg = new PGlite();
  await pg.exec(readFileSync(path.join(__dirname, "shim.sql"), "utf8"));
  for (const file of migrationFiles()) {
    try {
      await pg.exec(readFileSync(file, "utf8"));
    } catch (error) {
      throw new Error(`Falló la migración ${path.basename(file)}: ${(error as Error).message}`);
    }
  }

  const su = makeQuery(pg);

  const db: TestDb = {
    pg,
    su,
    as(who, fn) {
      return pg.transaction(async (tx) => {
        const special = who === "anon" || who === "service";
        const role = special ? ROLE[who] : "authenticated";
        const claims = special ? { role } : { sub: who, role: "authenticated" };
        await tx.exec(`set local role ${role}`);
        await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
        return fn(makeQuery(tx));
      });
    },
    async createUser(email, fullName) {
      const meta = fullName ? { full_name: fullName } : {};
      const row = await su.one<{ id: string }>(
        "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
        [email, JSON.stringify(meta)],
      );
      return row.id;
    },
    async createOrg(name, adminUserId, opts = {}) {
      return db.as("service", async (q) => {
        const row = await q.one<{ id: string }>(
          "select public.admin_create_organization($1, $2, $3) as id",
          [name, adminUserId, opts.isDemo ?? false],
        );
        return row.id;
      });
    },
    close: () => pg.close(),
  };
  return db;
}
