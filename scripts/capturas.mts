/**
 * Genera las capturas de la landing a partir de la demo pública.
 *   npm run build && npx next start -p 3100     (en otra terminal)
 *   npm run capturas                            (PORT=3100 por defecto)
 * Abre /demo con Chromium (1440×900, sin la barra lateral, es-AR, tema claro) y guarda en public/capturas/.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium, type Page } from "@playwright/test";

const port = process.env.PORT ?? "3100";
const base = `http://localhost:${port}`;
const out = join(process.cwd(), "public", "capturas");
mkdirSync(out, { recursive: true });

// Sólo el contenido (sin la barra lateral de 248 px): se lee mejor al achicarlo en la landing.
const CLIP = { x: 248, y: 0, width: 1192, height: 745 };

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "es-AR",
  colorScheme: "light",
  timezoneId: "America/Argentina/Buenos_Aires",
});
// Tema claro fijo, sin importar la preferencia guardada.
await context.addInitScript(() => {
  try {
    localStorage.setItem("theme", "light");
  } catch {
    /* sin storage */
  }
});
const page = await context.newPage();

async function settle(p: Page) {
  await p.waitForLoadState("networkidle");
  // Sin esqueletos de carga a la vista.
  await p.waitForFunction(
    () => !document.querySelector("[data-slot='skeleton'], .animate-pulse"),
    null,
    {
      timeout: 15_000,
    },
  );
  await p.waitForTimeout(600); // gráficos animados
}

async function shot(name: string) {
  await settle(page);
  await page.screenshot({ path: join(out, `${name}.png`), clip: CLIP });
  console.log(`✔ ${name}.png`);
}

/** Href de la fila de una lista que contiene `text` (la primera, o la última si `last`). */
async function rowHref(
  listPath: string,
  text: string,
  hrefStart: string,
  last = false,
): Promise<string> {
  await page.goto(`${base}${listPath}`);
  await settle(page);
  const rows = page.locator("tr", { hasText: text });
  const row = last ? rows.last() : rows.first();
  const href = await row.locator(`a[href^='${hrefStart}']`).first().getAttribute("href");
  if (!href) throw new Error(`No hay filas "${text}" en ${listPath}`);
  return href;
}

await page.goto(`${base}/demo`);
await page.waitForURL("**/app");
await shot("dashboard");

await page.goto(`${base}/app/inventario`);
await shot("inventario");

await page.goto(`${base}/app/produccion/nueva`);
await settle(page);
await page.getByRole("combobox", { name: /Producto/ }).click();
await page.getByRole("option").first().click();
await page.getByLabel(/Cantidad a fabricar/).fill("500");
await page.waitForTimeout(800);
await shot("produccion");

await page.goto(`${base}/app/productos`);
await settle(page);
const product = await page.locator("a[href^='/app/productos/']").first().getAttribute("href");
if (!product) throw new Error("No hay productos");
await page.goto(`${base}${product}`);
await shot("recetas");

await page.goto(`${base}${await rowHref("/app/compras", "Recibida", "/app/compras/", true)}`);
await shot("compras");

await page.goto(`${base}${await rowHref("/app/produccion", "Completada", "/app/produccion/")}`);
await settle(page);
// La ficha es larga: se muestra la sección de costos (planificado vs. real) arriba de todo.
await page.getByRole("heading", { name: "Costos" }).evaluate((el) => {
  window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 110);
});
await page.waitForTimeout(300);
await page.screenshot({ path: join(out, "costos.png"), clip: CLIP });
console.log("✔ costos.png");

await browser.close();
