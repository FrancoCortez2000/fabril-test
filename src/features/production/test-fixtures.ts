import type {
  OrderDetailData,
  OrderEvent,
  OrderFull,
  OrderMaterial,
  OrderReport,
  OrderRow,
  TeamMember,
} from "@/features/production/types";

export const OP_ID = "11111111-1111-4111-8111-111111111111";
export const PRODUCT_ID = "22222222-2222-4222-8222-222222222222";
export const MAT_A = "33333333-3333-4333-8333-333333333333";
export const MAT_B = "44444444-4444-4444-8444-444444444444";

export const orderRow = (over: Partial<OrderRow> = {}): OrderRow => ({
  id: OP_ID,
  code: "OP-2026-0056",
  status: "in_progress",
  priority: "normal",
  itemId: PRODUCT_ID,
  itemName: "Balde 10 L rojo",
  itemSku: "BAL-10L",
  unitCode: "u",
  plannedQty: 900,
  goodQty: 300,
  defectiveQty: 12,
  progressPct: 33,
  isDelayed: false,
  plannedStartDate: "2026-11-01",
  plannedEndDate: "2026-11-30",
  ...over,
});

export const orderFull = (over: Partial<OrderFull> = {}): OrderFull => ({
  ...orderRow(),
  notes: null,
  plannedMaterialCost: 100000,
  plannedLaborCost: 20000,
  plannedOverheadCost: 5000,
  actualMaterialCost: null,
  actualLaborCost: null,
  actualOverheadCost: null,
  actualUnitCost: null,
  startedAt: "2026-11-02T12:00:00+00:00",
  completedAt: null,
  cancelledAt: null,
  cancelReason: null,
  ...over,
});

export const materials: OrderMaterial[] = [
  {
    id: "m1",
    itemId: MAT_A,
    itemName: "Polipropileno copolímero",
    sku: "PP-COP",
    unitCode: "kg",
    plannedQty: 378,
    consumedQty: 378,
    returnedQty: 0,
    scrapQty: 2.5,
    wastePct: 3,
    costConsumed: 90000,
    available: 120,
  },
  {
    id: "m2",
    itemId: MAT_B,
    itemName: "Masterbatch rojo",
    sku: "MB-ROJO",
    unitCode: "kg",
    plannedQty: 5.4,
    consumedQty: 5.4,
    returnedQty: 0.4,
    scrapQty: 0,
    wastePct: 3,
    costConsumed: 8000,
    available: 41.2,
  },
];

export const team: TeamMember[] = [
  {
    id: "t1",
    employeeId: "e1",
    name: "Juan Sosa",
    position: "Operario",
    role: "responsable",
    hoursWorked: 12.5,
  },
];

export const reports: OrderReport[] = [
  {
    id: "r1",
    reportDate: "2026-11-05",
    goodQty: 300,
    defectiveQty: 12,
    notes: "Primer turno",
    employeeName: "Juan Sosa",
    createdAt: "2026-11-05T20:00:00+00:00",
  },
];

export const events: OrderEvent[] = [
  {
    id: "ev1",
    fromStatus: null,
    toStatus: "planned",
    note: null,
    occurredAt: "2026-11-01T12:00:00+00:00",
  },
  {
    id: "ev2",
    fromStatus: "planned",
    toStatus: "in_progress",
    note: "Materiales consumidos",
    occurredAt: "2026-11-02T12:00:00+00:00",
  },
];

export const detail = (over: Partial<OrderDetailData> = {}): OrderDetailData => ({
  order: orderFull(),
  materials,
  team,
  reports,
  events,
  ...over,
});
