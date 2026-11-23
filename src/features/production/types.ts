import type { ProductionStatus } from "@/lib/domain/status";

export type { ProductionStatus };

export type OrderPriority = "low" | "normal" | "high" | "urgent";

export const PRIORITY_LABELS: Record<OrderPriority, string> = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

/** Fila de la lista de órdenes (vista `production_order_overview`). */
export type OrderRow = {
  id: string;
  code: string;
  status: ProductionStatus;
  priority: OrderPriority;
  itemId: string;
  itemName: string;
  itemSku: string;
  unitCode: string;
  plannedQty: number;
  goodQty: number;
  defectiveQty: number;
  progressPct: number;
  isDelayed: boolean;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
};

/** Orden con sus costos, fechas y notas (ficha). */
export type OrderFull = OrderRow & {
  notes: string | null;
  plannedMaterialCost: number;
  plannedLaborCost: number;
  plannedOverheadCost: number;
  actualMaterialCost: number | null;
  actualLaborCost: number | null;
  actualOverheadCost: number | null;
  actualUnitCost: number | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
};

export type OrderMaterial = {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  unitCode: string;
  plannedQty: number;
  consumedQty: number;
  returnedQty: number;
  scrapQty: number;
  wastePct: number;
  costConsumed: number;
  /** Stock menos lo comprometido hoy (no es el disponible de cuando se creó la orden). */
  available: number;
};

export type TeamMember = {
  id: string;
  employeeId: string;
  name: string;
  position: string | null;
  role: string;
  hoursWorked: number;
};

export type OrderReport = {
  id: string;
  reportDate: string;
  goodQty: number;
  defectiveQty: number;
  notes: string | null;
  employeeName: string | null;
  createdAt: string;
};

export type OrderEvent = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  occurredAt: string;
};

export type OrderDetailData = {
  order: OrderFull;
  materials: OrderMaterial[];
  team: TeamMember[];
  reports: OrderReport[];
  events: OrderEvent[];
};
