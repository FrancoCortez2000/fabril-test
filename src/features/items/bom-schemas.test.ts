import { bomSchema, saveBomSchema } from "@/features/items/bom-schemas";

const PEAD = "11111111-1111-4111-8111-111111111111";
const MB = "22222222-2222-4222-8222-222222222222";

const valid = {
  outputQty: 1,
  defaultWastePct: null,
  notes: "",
  lines: [
    { componentItemId: PEAD, quantity: 0.25, wastePct: null },
    { componentItemId: MB, quantity: 0.005, wastePct: 5 },
  ],
};

const messages = (input: unknown) =>
  (bomSchema.safeParse(input).error?.issues ?? []).map((i) => i.message);

describe("bomSchema", () => {
  test("acepta una receta completa", () => {
    expect(bomSchema.safeParse(valid).success).toBe(true);
  });

  test("rechaza una lista vacía", () => {
    expect(messages({ ...valid, lines: [] })).toContain(
      "La receta necesita al menos una materia prima",
    );
  });

  test("rechaza un componente repetido", () => {
    expect(
      messages({
        ...valid,
        lines: [
          { componentItemId: PEAD, quantity: 1, wastePct: null },
          { componentItemId: PEAD, quantity: 2, wastePct: null },
        ],
      }),
    ).toContain("Esa materia prima ya está en la receta");
  });

  test.each([
    ["cantidad cero", { lines: [{ componentItemId: PEAD, quantity: 0, wastePct: null }] }],
    ["cantidad negativa", { lines: [{ componentItemId: PEAD, quantity: -1, wastePct: null }] }],
    ["desperdicio de 101 %", { lines: [{ componentItemId: PEAD, quantity: 1, wastePct: 101 }] }],
    ["desperdicio negativo", { lines: [{ componentItemId: PEAD, quantity: 1, wastePct: -1 }] }],
    [
      "componente que no es un id",
      { lines: [{ componentItemId: "x", quantity: 1, wastePct: null }] },
    ],
    ["rendimiento cero", { outputQty: 0 }],
    ["desperdicio por defecto de 150 %", { defaultWastePct: 150 }],
  ])("rechaza %s", (_name, override) => {
    expect(bomSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });

  test("las notas largas se rechazan", () => {
    expect(bomSchema.safeParse({ ...valid, notes: "x".repeat(501) }).success).toBe(false);
  });
});

describe("saveBomSchema", () => {
  test("exige el id del producto", () => {
    expect(saveBomSchema.safeParse(valid).success).toBe(false);
    expect(saveBomSchema.safeParse({ ...valid, itemId: PEAD }).success).toBe(true);
  });
});
