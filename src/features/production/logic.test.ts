import { calculateMaterialRequirements } from "@/features/production/logic";

describe("calculateMaterialRequirements", () => {
  test("aplica el desperdicio de la receta y calcula faltantes (1.000 bidones)", () => {
    const result = calculateMaterialRequirements({
      plannedQty: 1000,
      outputQty: 1,
      defaultWastePct: 3,
      lines: [
        { itemId: "pe", name: "Polietileno", unitCode: "kg", quantity: 0.25, wastePct: null },
        { itemId: "et", name: "Etiqueta", unitCode: "u", quantity: 1, wastePct: 0 },
      ],
      stock: { pe: 200, et: 5000 },
    });

    expect(result).toEqual([
      {
        itemId: "pe",
        name: "Polietileno",
        unitCode: "kg",
        required: 257.5,
        available: 200,
        shortage: 57.5,
      },
      {
        itemId: "et",
        name: "Etiqueta",
        unitCode: "u",
        required: 1000,
        available: 5000,
        shortage: 0,
      },
    ]);
  });

  test("divide por el rendimiento de la receta", () => {
    const [line] = calculateMaterialRequirements({
      plannedQty: 1000,
      outputQty: 10,
      defaultWastePct: 0,
      lines: [
        { itemId: "pp", name: "Polipropileno", unitCode: "kg", quantity: 2.5, wastePct: null },
      ],
      stock: {},
    });
    expect(line?.required).toBe(250);
  });

  test("redondea a 3 decimales sin arrastrar errores de punto flotante", () => {
    const [line] = calculateMaterialRequirements({
      plannedQty: 3,
      outputQty: 1,
      defaultWastePct: 3,
      lines: [{ itemId: "x", name: "Colorante", unitCode: "kg", quantity: 0.3333, wastePct: null }],
      stock: {},
    });
    expect(line?.required).toBe(1.03);
  });

  test("un material sin stock registrado tiene 0 disponible", () => {
    const [line] = calculateMaterialRequirements({
      plannedQty: 10,
      outputQty: 1,
      defaultWastePct: 0,
      lines: [{ itemId: "z", name: "Asa", unitCode: "u", quantity: 1, wastePct: null }],
      stock: {},
    });
    expect(line).toMatchObject({ available: 0, shortage: 10 });
  });
});
