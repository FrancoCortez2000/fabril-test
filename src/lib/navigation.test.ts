import {
  NAV_GROUPS,
  NAV_ITEMS,
  groupedNavItems,
  isNavItemActive,
  navItemsFor,
} from "@/lib/navigation";

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
    "Costos",
    "Empleados",
    "Configuración",
  ]);
});

test("no hay todavía Proveedores ni Reportes en el menú", () => {
  const labels = NAV_ITEMS.map((i) => i.label);
  for (const removed of ["Proveedores", "Reportes"]) {
    expect(labels).not.toContain(removed);
  }
});

test("todos los grupos usados tienen título", () => {
  for (const item of NAV_ITEMS) expect(NAV_GROUPS[item.group]).toBeDefined();
});

describe("navItemsFor", () => {
  test("un miembro ve Configuración", () => {
    expect(navItemsFor("member").map((i) => i.label)).toContain("Configuración");
  });

  test("en la demo no existe Configuración y el resto queda igual", () => {
    expect(navItemsFor("demo").map((i) => i.label)).toEqual([
      "Inicio",
      "Producción",
      "Inventario",
      "Productos",
      "Materias primas",
      "Compras",
      "Costos",
      "Empleados",
    ]);
  });

  test("groupedNavItems no deja grupos vacíos en la demo", () => {
    const groups = groupedNavItems("demo");
    expect(groups.map((g) => g.group)).toEqual(["inicio", "operacion"]);
    expect(groups.every((g) => g.items.length > 0)).toBe(true);
  });
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
