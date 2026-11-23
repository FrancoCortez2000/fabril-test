import { alertHref, parseDashboardData } from "@/features/dashboard/data";

const ITEM = "11111111-1111-4111-8111-111111111111";

const valid = {
  asOf: "2026-11-10",
  kpis: {
    products: 1,
    rawMaterials: 4,
    inventoryValue: 30100,
    activeOrders: 2,
    unitsThisMonth: 700,
    unitsSamePeriodLastMonth: 250,
  },
  monthlyProduction: [{ month: "2026-11", units: 700 }],
  inventoryFlow: [{ month: "2026-11", inValue: 14000, outValue: 2400 }],
  alerts: [
    {
      kind: "out_of_stock",
      title: "Aditivo sin stock",
      detail: "Sin stock disponible (mínimo 10 kg)",
      entityType: "item",
      entityId: ITEM,
      itemType: "raw_material",
    },
  ],
};

describe("parseDashboardData", () => {
  test("acepta el contrato de dashboard_data", () => {
    expect(parseDashboardData(valid)).toEqual(valid);
  });

  test("una fábrica vacía produce un dashboard válido", () => {
    const empty = parseDashboardData({
      asOf: "2026-11-10",
      kpis: {
        products: 0,
        rawMaterials: 0,
        inventoryValue: 0,
        activeOrders: 0,
        unitsThisMonth: 0,
        unitsSamePeriodLastMonth: 0,
      },
      monthlyProduction: [],
      inventoryFlow: [],
      alerts: [],
    });
    expect(empty.alerts).toEqual([]);
    expect(empty.kpis.inventoryValue).toBe(0);
  });

  test.each([
    ["sin kpis", { ...valid, kpis: undefined }],
    ["fecha inválida", { ...valid, asOf: "10/11/2026" }],
    ["alerta de tipo desconocido", { ...valid, alerts: [{ ...valid.alerts[0], kind: "otra" }] }],
    ["null", null],
    ["texto", "hola"],
  ])("rechaza %s", (_name, input) => {
    expect(() => parseDashboardData(input)).toThrow();
  });
});

describe("alertHref", () => {
  test("las alertas de stock llevan a la ficha del ítem según su tipo", () => {
    expect(
      alertHref({
        kind: "low_stock",
        entityType: "item",
        entityId: ITEM,
        itemType: "raw_material",
      }),
    ).toBe(`/app/materias-primas/${ITEM}`);
    expect(
      alertHref({
        kind: "out_of_stock",
        entityType: "item",
        entityId: ITEM,
        itemType: "finished_good",
      }),
    ).toBe(`/app/productos/${ITEM}`);
  });

  test("las órdenes y compras llevan a su lista (las fichas llegan en el bloque 4B)", () => {
    expect(
      alertHref({
        kind: "delayed_order",
        entityType: "production_order",
        entityId: ITEM,
        itemType: null,
      }),
    ).toBe("/app/produccion");
    expect(
      alertHref({
        kind: "late_purchase",
        entityType: "purchase_order",
        entityId: ITEM,
        itemType: null,
      }),
    ).toBe("/app/compras");
  });
});
