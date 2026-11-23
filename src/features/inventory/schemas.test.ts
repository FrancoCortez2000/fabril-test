import { adjustmentSchema, movementSchema, reverseSchema } from "@/features/inventory/schemas";

const ITEM = "11111111-1111-4111-8111-111111111111";

const entry = {
  itemId: ITEM,
  type: "manual_in",
  quantity: 10,
  unitCost: 50,
  reason: "Conteo físico",
};

const issues = (schema: typeof movementSchema | typeof adjustmentSchema, input: unknown) =>
  (schema.safeParse(input).error?.issues ?? []).map((i) => i.message);

describe("movementSchema", () => {
  test("acepta una entrada con costo y una salida sin costo", () => {
    expect(movementSchema.safeParse(entry).success).toBe(true);
    expect(movementSchema.safeParse({ ...entry, type: "manual_out", unitCost: null }).success).toBe(
      true,
    );
  });

  test("la entrada puede no informar costo (usa el promedio)", () => {
    expect(movementSchema.safeParse({ ...entry, unitCost: null }).success).toBe(true);
  });

  test.each([
    ["motivo vacío", { reason: "" }],
    ["motivo de solo espacios", { reason: "   " }],
    ["motivo de dos letras", { reason: "ok" }],
    ["motivo larguísimo", { reason: "x".repeat(201) }],
    ["cantidad cero", { quantity: 0 }],
    ["cantidad negativa", { quantity: -5 }],
    ["costo negativo", { unitCost: -1 }],
    ["tipo inexistente", { type: "manual_x" }],
    ["ítem que no es un id", { itemId: "abc" }],
  ])("rechaza %s", (_name, override) => {
    expect(movementSchema.safeParse({ ...entry, ...override }).success).toBe(false);
  });

  test("el motivo vacío explica qué falta", () => {
    expect(issues(movementSchema, { ...entry, reason: "" })).toContain(
      "Indicá el motivo del movimiento",
    );
  });

  test("una salida con costo se rechaza", () => {
    expect(issues(movementSchema, { ...entry, type: "manual_out" })).toContain(
      "El costo sólo se informa en las entradas",
    );
  });
});

describe("adjustmentSchema", () => {
  const base = { itemId: ITEM, countedQty: 42, reason: "Conteo de fin de mes" };

  test("acepta el conteo, incluso en cero", () => {
    expect(adjustmentSchema.safeParse(base).success).toBe(true);
    expect(adjustmentSchema.safeParse({ ...base, countedQty: 0 }).success).toBe(true);
  });

  test.each([
    ["conteo negativo", { countedQty: -1 }],
    ["motivo vacío", { reason: "" }],
    ["motivo corto", { reason: "ab" }],
    ["ítem inválido", { itemId: "x" }],
  ])("rechaza %s", (_name, override) => {
    expect(adjustmentSchema.safeParse({ ...base, ...override }).success).toBe(false);
  });
});

describe("reverseSchema", () => {
  const base = { movementId: "11111111-1111-4111-8111-111111111111", reason: "Error de carga" };

  test("acepta un movimiento y un motivo", () => {
    expect(reverseSchema.safeParse(base).success).toBe(true);
  });

  test.each([
    ["motivo vacío", { reason: "" }],
    ["motivo de solo espacios", { reason: "   " }],
    ["motivo corto", { reason: "ab" }],
    ["movimiento que no es un id", { movementId: "x" }],
  ])("rechaza %s", (_name, override) => {
    expect(reverseSchema.safeParse({ ...base, ...override }).success).toBe(false);
  });

  test("el motivo vacío explica qué falta", () => {
    expect(issues(reverseSchema as never, { ...base, reason: "" })).toContain(
      "Indicá el motivo de la reversión",
    );
  });
});
