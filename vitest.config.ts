import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    // La lógica pura corre en Node; los tests de componentes declaran
    // `// @vitest-environment jsdom` al inicio del archivo.
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "supabase/tests/**/*.test.ts", "scripts/**/*.test.ts"],
    // Las pruebas SQL levantan un Postgres en WASM (PGlite) y aplican las migraciones.
    testTimeout: 60_000,
    hookTimeout: 180_000,
    pool: "threads",
    maxWorkers: 2,
    env: { TZ: "UTC" },
  },
});
