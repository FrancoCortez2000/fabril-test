import { NAV_GROUPS, NAV_ITEMS, isNavItemActive } from "@/lib/navigation";

test("cada destino del menú es único y está dentro del panel", () => {
  const hrefs = NAV_ITEMS.map((i) => i.href);
  expect(new Set(hrefs).size).toBe(hrefs.length);
  expect(hrefs.every((h) => h.startsWith("/app"))).toBe(true);
});

test("respeta el orden de módulos acordado", () => {
  expect(NAV_ITEMS.map((i) => i.label)).toEqual([
    "Inicio",
    "Producción",
    "Inventario",
    "Productos",
    "Materias primas",
    "Compras",
    "Proveedores",
    "Empleados",
    "Costos",
    "Reportes",
    "Configuración",
  ]);
});

test("todos los grupos usados tienen título", () => {
  for (const item of NAV_ITEMS) expect(NAV_GROUPS[item.group]).toBeDefined();
});

describe("isNavItemActive", () => {
  test("una ficha activa su módulo", () => {
    expect(isNavItemActive("/app/produccion/123", "/app/produccion")).toBe(true);
  });
  test("Inicio sólo está activo en su ruta exacta", () => {
    expect(isNavItemActive("/app/produccion", "/app")).toBe(false);
    expect(isNavItemActive("/app", "/app")).toBe(true);
  });
  test("no confunde prefijos parecidos", () => {
    expect(isNavItemActive("/app/productos-archivados", "/app/productos")).toBe(false);
  });
});
