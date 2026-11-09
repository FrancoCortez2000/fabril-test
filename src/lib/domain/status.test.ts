import { PRODUCTION_STATUS, PURCHASE_STATUS, isProductionOrderDelayed } from "@/lib/domain/status";

describe("etiquetas de estado", () => {
  test("producción en español", () => {
    expect(PRODUCTION_STATUS.quality_check.label).toBe("Control de calidad");
    expect(Object.values(PRODUCTION_STATUS).map((s) => s.label)).toEqual([
      "Planificada",
      "En producción",
      "Control de calidad",
      "Completada",
      "Cancelada",
    ]);
  });

  test("compras en español", () => {
    expect(Object.values(PURCHASE_STATUS).map((s) => s.label)).toEqual([
      "Borrador",
      "Pendiente",
      "Parcialmente recibida",
      "Recibida",
      "Cerrada con faltantes",
      "Cancelada",
    ]);
  });
});

describe("isProductionOrderDelayed", () => {
  test("una orden abierta con fecha de fin vencida está demorada", () => {
    expect(
      isProductionOrderDelayed(
        { status: "in_progress", plannedEndDate: "2026-11-08" },
        "2026-11-09",
      ),
    ).toBe(true);
  });
  test("una orden completada nunca está demorada", () => {
    expect(
      isProductionOrderDelayed({ status: "completed", plannedEndDate: "2026-11-08" }, "2026-11-09"),
    ).toBe(false);
  });
  test("el mismo día de fin todavía no está demorada", () => {
    expect(
      isProductionOrderDelayed({ status: "planned", plannedEndDate: "2026-11-09" }, "2026-11-09"),
    ).toBe(false);
  });
  test("una orden cancelada no está demorada", () => {
    expect(
      isProductionOrderDelayed({ status: "cancelled", plannedEndDate: "2026-01-01" }, "2026-11-09"),
    ).toBe(false);
  });
});
