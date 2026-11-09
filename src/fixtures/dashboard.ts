/**
 * DATOS DE EJEMPLO (Etapa 2) para la maqueta del dashboard.
 * Fábrica ficticia de productos plásticos. Se reemplazan por consultas reales en la Etapa 4.
 */
import type {
  ActivityEntry,
  DashboardAlert,
  DashboardKpis,
  InventoryFlow,
  MonthlyProduction,
} from "@/features/dashboard/types";

/** "Ahora" fijo de la maqueta, para que los tiempos relativos sean estables. */
export const FIXTURE_NOW = new Date("2026-11-09T18:30:00Z");
export const FIXTURE_TODAY = "2026-11-09";

export const FIXTURE_KPIS: DashboardKpis = {
  products: 12,
  rawMaterials: 14,
  inventoryValue: 48_730_215,
  activeOrders: 9,
  unitsThisMonth: 13_150,
  unitsSamePeriodLastMonth: 12_380,
};

export const FIXTURE_MONTHLY_PRODUCTION: MonthlyProduction = [
  { month: "2025-12", units: 31_200 },
  { month: "2026-01", units: 22_400 },
  { month: "2026-02", units: 26_800 },
  { month: "2026-03", units: 33_900 },
  { month: "2026-04", units: 35_100 },
  { month: "2026-05", units: 32_700 },
  { month: "2026-06", units: 29_300 },
  { month: "2026-07", units: 30_800 },
  { month: "2026-08", units: 36_200 },
  { month: "2026-09", units: 38_900 },
  { month: "2026-10", units: 41_350 },
  { month: "2026-11", units: 13_150 },
];

export const FIXTURE_INVENTORY_FLOW: InventoryFlow = [
  { month: "2025-12", inValue: 21_400_000, outValue: 23_900_000 },
  { month: "2026-01", inValue: 14_800_000, outValue: 16_200_000 },
  { month: "2026-02", inValue: 19_900_000, outValue: 18_700_000 },
  { month: "2026-03", inValue: 26_300_000, outValue: 24_100_000 },
  { month: "2026-04", inValue: 27_800_000, outValue: 26_900_000 },
  { month: "2026-05", inValue: 25_100_000, outValue: 26_400_000 },
  { month: "2026-06", inValue: 24_600_000, outValue: 23_800_000 },
  { month: "2026-07", inValue: 27_200_000, outValue: 26_100_000 },
  { month: "2026-08", inValue: 31_900_000, outValue: 30_200_000 },
  { month: "2026-09", inValue: 34_700_000, outValue: 33_800_000 },
  { month: "2026-10", inValue: 38_200_000, outValue: 37_400_000 },
  { month: "2026-11", inValue: 15_600_000, outValue: 17_900_000 },
];

export const FIXTURE_ALERTS: DashboardAlert[] = [
  {
    kind: "out_of_stock",
    title: "Masterbatch azul sin stock",
    detail: "Lo necesitan 2 órdenes planificadas",
    href: "/app/materias-primas",
  },
  {
    kind: "delayed_order",
    title: "OP-2026-0131 · Balde 10 L blanco",
    detail: "Debía terminar el 06/11/2026 · 64 % de avance",
    href: "/app/produccion",
  },
  {
    kind: "low_stock",
    title: "Polipropileno copolímero",
    detail: "Quedan 180 kg · mínimo 500 kg",
    href: "/app/materias-primas",
  },
  {
    kind: "late_purchase",
    title: "OC-2026-0088 · Etiquetas del Sur",
    detail: "Entrega prevista el 04/11/2026 · pendiente",
    href: "/app/compras",
  },
  {
    kind: "low_stock",
    title: "Tapa 38 mm a rosca",
    detail: "Quedan 1.200 u · mínimo 5.000 u",
    href: "/app/productos",
  },
];

export const FIXTURE_ACTIVITY: ActivityEntry[] = [
  {
    id: "a1",
    summary: "OP-2026-0137 pasó a Control de calidad",
    actor: "Laura Benítez",
    at: "2026-11-09T17:52:00Z",
  },
  {
    id: "a2",
    summary: "Recepción de OC-2026-0091: 2.000 kg de Polietileno AD",
    actor: "Laura Benítez",
    at: "2026-11-09T15:10:00Z",
  },
  {
    id: "a3",
    summary: "Parte de avance en OP-2026-0135: 3.400 buenas, 42 defectuosas",
    actor: "Laura Benítez",
    at: "2026-11-09T13:05:00Z",
  },
  {
    id: "a4",
    summary: "Nueva orden OP-2026-0138 · Bidón 20 L natural × 800",
    actor: "Laura Benítez",
    at: "2026-11-08T20:40:00Z",
  },
  {
    id: "a5",
    summary: "Ajuste de inventario: Film stretch −12 kg (conteo físico)",
    actor: "Laura Benítez",
    at: "2026-11-08T14:15:00Z",
  },
];
