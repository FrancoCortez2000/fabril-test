import { ActionError, isOutOfRange, mapDbError } from "@/lib/db-errors";

test("P0001 pasa el mensaje de negocio tal cual", () => {
  expect(
    mapDbError({ code: "P0001", message: "No hay stock suficiente de PEAD: faltan 12,5 kg" }),
  ).toBe("No hay stock suficiente de PEAD: faltan 12,5 kg");
});

test.each([
  ["42501", "No tenés permiso para hacer esto en esta fábrica"],
  ["23505", "Ya existe un registro con ese dato (por ejemplo, el mismo SKU)"],
  ["23503", "No se puede completar porque está vinculado a otros registros"],
])("código %s", (code, message) => {
  expect(mapDbError({ code, message: "detalle técnico de Postgres" })).toBe(message);
});

test("ActionError se muestra tal cual", () => {
  expect(mapDbError(new ActionError("El enlace venció"))).toBe("El enlace venció");
});

test("errores desconocidos nunca exponen el detalle técnico", () => {
  const generic = "No pudimos completar la operación. Probá de nuevo.";
  expect(mapDbError({ code: "42P01", message: 'relation "x" does not exist' })).toBe(generic);
  expect(mapDbError(new TypeError("fetch failed"))).toBe(generic);
  expect(mapDbError("raro")).toBe(generic);
});

describe("isOutOfRange", () => {
  test("reconoce la página fuera de rango de PostgREST", () => {
    expect(isOutOfRange({ code: "PGRST103", message: "offset" })).toBe(true);
  });

  test("no confunde otros errores", () => {
    expect(isOutOfRange({ code: "42501" })).toBe(false);
    expect(isOutOfRange(new Error("boom"))).toBe(false);
    expect(isOutOfRange(null)).toBe(false);
    expect(isOutOfRange(undefined)).toBe(false);
  });
});
