export type ProductionStatus =
  "planned" | "in_progress" | "quality_check" | "completed" | "cancelled";

export type PurchaseStatus =
  "draft" | "pending" | "partially_received" | "received" | "closed" | "cancelled";

export type StatusMeta = {
  label: string;
  /** Clase Tailwind del punto de color (definida en los tokens `status-*`). */
  color: string;
};

export const PRODUCTION_STATUS: Record<ProductionStatus, StatusMeta> = {
  planned: { label: "Planificada", color: "bg-status-planned" },
  in_progress: { label: "En producción", color: "bg-status-in-progress" },
  quality_check: { label: "Control de calidad", color: "bg-status-quality" },
  completed: { label: "Completada", color: "bg-status-completed" },
  cancelled: { label: "Cancelada", color: "bg-status-cancelled" },
};

export const PURCHASE_STATUS: Record<PurchaseStatus, StatusMeta> = {
  draft: { label: "Borrador", color: "bg-status-cancelled" },
  pending: { label: "Pendiente", color: "bg-status-pending" },
  partially_received: { label: "Parcialmente recibida", color: "bg-status-in-progress" },
  received: { label: "Recibida", color: "bg-status-completed" },
  closed: { label: "Cerrada con faltantes", color: "bg-status-planned" },
  cancelled: { label: "Cancelada", color: "bg-status-cancelled" },
};

const OPEN_PRODUCTION_STATUSES: ProductionStatus[] = ["planned", "in_progress", "quality_check"];

/**
 * "Demorada" no es un estado: es una condición calculada (docs/plan-tecnico.md §4.2).
 * Fechas en formato `YYYY-MM-DD`, comparables como texto.
 */
export function isProductionOrderDelayed(
  order: { status: ProductionStatus; plannedEndDate: string },
  today: string,
): boolean {
  return OPEN_PRODUCTION_STATUSES.includes(order.status) && order.plannedEndDate < today;
}
