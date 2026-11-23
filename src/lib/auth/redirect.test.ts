import { routeDecision, safeNextPath } from "@/lib/auth/redirect";

describe("safeNextPath", () => {
  test.each([
    ["/app", "/app"],
    ["/app/productos", "/app/productos"],
    ["/app/productos?q=balde", "/app/productos?q=balde"],
    ["/restablecer", "/restablecer"],
  ])("acepta %s", (raw, expected) => {
    expect(safeNextPath(raw)).toBe(expected);
  });

  test.each([
    ["https://evil.com"],
    ["//evil.com"],
    ["/\evil.com"],
    ["/appevil"],
    ["/ingresar"],
    ["javascript:alert(1)"],
    ["/app/../../evil"],
    [""],
  ])("rechaza %s", (raw) => {
    expect(safeNextPath(raw)).toBe("/app");
  });

  test("null o undefined usan el valor por defecto", () => {
    expect(safeNextPath(null)).toBe("/app");
    expect(safeNextPath(undefined, "/restablecer")).toBe("/restablecer");
  });
});

describe("routeDecision", () => {
  test("sin sesión, /app manda a ingresar recordando la ruta", () => {
    expect(routeDecision("/app/productos", "?q=balde", false)).toEqual({
      redirectTo: "/ingresar?next=%2Fapp%2Fproductos%3Fq%3Dbalde",
    });
    expect(routeDecision("/app", "", false)).toEqual({ redirectTo: "/ingresar?next=%2Fapp" });
  });

  test("con sesión, ingresar y recuperar mandan al panel", () => {
    expect(routeDecision("/ingresar", "", true)).toEqual({ redirectTo: "/app" });
    expect(routeDecision("/recuperar", "", true)).toEqual({ redirectTo: "/app" });
  });

  test("el resto no redirige", () => {
    expect(routeDecision("/app/productos", "", true)).toBeNull();
    expect(routeDecision("/ingresar", "", false)).toBeNull();
    expect(routeDecision("/restablecer", "", false)).toBeNull();
    expect(routeDecision("/restablecer", "", true)).toBeNull();
  });
});

describe("routeDecision en modo demo", () => {
  test("sin sesión pero con la demo activa, el panel y el ingreso pasan", () => {
    expect(routeDecision("/app", "", false, true)).toBeNull();
    expect(routeDecision("/app/productos", "?q=balde", false, true)).toBeNull();
    expect(routeDecision("/ingresar", "?demo=no-disponible", false, true)).toBeNull();
  });

  test("sin demo activa nada cambia", () => {
    expect(routeDecision("/app", "", false, false)).toEqual({
      redirectTo: "/ingresar?next=%2Fapp",
    });
    expect(routeDecision("/app", "", false)).toEqual({ redirectTo: "/ingresar?next=%2Fapp" });
  });

  test("con sesión real la bandera de demo se ignora", () => {
    expect(routeDecision("/ingresar", "", true, true)).toEqual({ redirectTo: "/app" });
    expect(routeDecision("/app", "", true, true)).toBeNull();
  });
});
