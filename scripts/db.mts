/**
 * Migraciones y tipos contra el proyecto de Supabase en la nube.
 *   npm run db:push    → vincula el proyecto y aplica supabase/migrations
 *   npm run db:types   → regenera src/types/database.ts
 * Los secretos viajan por variables de entorno del proceso, nunca como argumentos visibles.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

import { fail, requireEnv } from "./lib/env.mts";

const env = requireEnv("SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN", "SUPABASE_DB_PASSWORD");
const childEnv = {
  ...process.env,
  SUPABASE_ACCESS_TOKEN: env.SUPABASE_ACCESS_TOKEN,
  SUPABASE_DB_PASSWORD: env.SUPABASE_DB_PASSWORD,
};

function supabase(args: string[], capture = false) {
  const result = spawnSync("npx", ["supabase", ...args], {
    env: childEnv,
    stdio: capture ? ["inherit", "pipe", "inherit"] : "inherit",
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) fail(`Falló: supabase ${args[0]} ${args[1] ?? ""}`);
  return result.stdout ?? "";
}

const command = process.argv[2];
if (command === "push") {
  supabase(["link", "--project-ref", env.SUPABASE_PROJECT_REF]);
  supabase(["db", "push"]);
  console.log("\n✓ Migraciones aplicadas.");
} else if (command === "types") {
  const types = supabase(
    ["gen", "types", "typescript", "--project-id", env.SUPABASE_PROJECT_REF, "--schema", "public"],
    true,
  );
  writeFileSync(
    "src/types/database.ts",
    `/** Generado con \`npm run db:types\` a partir del esquema de Supabase. No editar a mano. */\n${types}`,
  );
  console.log("✓ src/types/database.ts actualizado.");
} else {
  fail("Uso: node --env-file=.env.local scripts/db.mts push|types");
}
