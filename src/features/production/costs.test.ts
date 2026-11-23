import { costVariance, plannedTotal, actualTotal } from "@/features/production/costs";
import { orderFull } from "@/features/production/test-fixtures";

describe("costVariance", () => {
  test("más caro: desvío positivo", () => {
    expect(costVariance(1000, 1100)).toEqual({ amount: 100, pct: 10 });
  });

  test("más barato: desvío negativo", () => {
    expect(costVariance(1000, 900)).toEqual({ amount: -100, pct: -10 });
  });

  test("igual: cero", () => {
    expect(costVariance(1000, 1000)).toEqual({ amount: 0, pct: 0 });
  });

  test("el porcentaje se redondea a un decimal", () => {
    expect(costVariance(3, 4)).toEqual({ amount: 1, pct: 33.3 });
  });

  test("con lo planificado en cero no hay porcentaje", () => {
    expect(costVariance(0, 250)).toEqual({ amount: 250, pct: null });
  });

  test("sin costo real todavía no hay desvío", () => {
    expect(costVariance(1000, null)).toBeNull();
  });

  test("el desvío no arrastra errores de punto flotante", () => {
    expect(costVariance(0.1, 0.3)).toEqual({ amount: 0.2, pct: 200 });
  });
});

describe("totales de costo de una orden", () => {
  test("planificado suma materiales, mano de obra e indirectos", () => {
    expect(plannedTotal(orderFull())).toBe(125000);
  });

  test("real es nulo hasta que la orden se completa", () => {
    expect(actualTotal(orderFull())).toBeNull();
  });

  test("real suma los tres componentes", () => {
    expect(
      actualTotal(
        orderFull({ actualMaterialCost: 98000, actualLaborCost: 21000, actualOverheadCost: 5000 }),
      ),
    ).toBe(124000);
  });
});
