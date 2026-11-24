/**
 * Revisión visual de la demo: recorre las pantallas a 360, 768 y 1280 px en tema claro y oscuro,
 * avisa de desbordes horizontales y errores de consola, y guarda capturas en la carpeta indicada.
 *   npm run build && npx next start -p 3100     (en otra terminal)
 *   node scripts/revision-visual.mts <carpeta-de-salida>
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "@playwright/test";

const base = `http://localhost:${process.env.PORT ?? "3100"}`;
const out = process.argv[2];
if (!out) throw new Error("Uso: node scripts/revision-visual.mts <carpeta-de-salida>");
mkdirSync(out, { recursive: true });

const WIDTHS = [
  { name: "movil", width: 360, height: 740 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "escritorio", width: 1280, height: 800 },
];
const THEMES = ["light", "dark"] as const;

const browser = await chromium.launch();
const problems: string[] = [];

// Rutas con id: se resuelven desde las listas con una sesión de demo.
async function discover() {
  const context = await browser.newContext({ locale: "es-AR" });
  const page = await context.newPage();
  await page.goto(`${base}/demo`);
  await page.waitForURL("**/app");
  const first = async (list: string, prefix: string, text?: string) => {
    await page.goto(`${base}${list}`);
    await page.waitForLoadState("networkidle");
    const rows = text ? page.locator("tr", { hasText: text }) : page.locator("tr");
    const href = await rows.locator(`a[href^='${prefix}']`).first().getAttribute("href");
    return href ?? list;
  };
  const found = {
    orden: await first("/app/produccion", "/app/produccion/", "Completada"),
    compra: await first("/app/compras", "/app/compras/", "Recibida"),
    producto: await first("/app/productos", "/app/productos/"),
  };
  await context.close();
  return found;
}

const ids = await discover();
const ROUTES: [string, string][] = [
  ["landing", "/"],
  ["ingresar", "/ingresar"],
  ["inicio", "/app"],
  ["produccion", "/app/produccion"],
  ["orden", ids.orden],
  ["nueva-orden", "/app/produccion/nueva"],
  ["inventario", "/app/inventario"],
  ["productos", "/app/productos"],
  ["producto", ids.producto],
  ["compras", "/app/compras"],
  ["compra", ids.compra],
  ["costos", "/app/costos"],
  ["empleados", "/app/empleados"],
];

for (const theme of THEMES) {
  for (const w of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width: w.width, height: w.height },
      locale: "es-AR",
      colorScheme: theme,
    });
    await context.addInitScript((t) => {
      try {
        localStorage.setItem("theme", t);
      } catch {
        /* sin storage */
      }
    }, theme);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text().slice(0, 160));
    });
    page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));

    await page.goto(`${base}/demo`);
    await page.waitForURL("**/app");

    for (const [name, path] of ROUTES) {
      errors.length = 0;
      await page.goto(`${base}${path}`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      const tag = `${name} · ${w.name} · ${theme}`;
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth - doc.clientWidth;
      });
      if (overflow > 1) problems.push(`DESBORDE ${tag}: ${overflow}px de más`);
      const dark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
      if (dark !== (theme === "dark")) problems.push(`TEMA ${tag}: no se aplicó el tema`);
      for (const e of errors) problems.push(`CONSOLA ${tag}: ${e}`);
      await page.screenshot({ path: join(out, `${name}-${w.name}-${theme}.png`) });
    }
    await context.close();
  }
}

await browser.close();
console.log(problems.length ? problems.join("\n") : "Sin desbordes ni errores de consola.");
