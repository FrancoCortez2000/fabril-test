import type { OrderFull } from "@/features/production/types";

const round = (value: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

/**
 * Desvío del costo real respecto del planificado. `null` si todavía no hay costo real; el
 * porcentaje es `null` si lo planificado es cero (no se puede dividir).
 */
export function costVariance(
  planned: number,
  actual: number | null,
): { amount: number; pct: number | null } | null {
  if (actual === null) return null;
  const amount = round(actual - planned, 2);
  return { amount, pct: planned === 0 ? null : round((amount / planned) * 100, 1) };
}

export function plannedTotal(order: OrderFull): number {
  return round(order.plannedMaterialCost + order.plannedLaborCost + order.plannedOverheadCost, 2);
}

/** Costo real total, o `null` hasta que la orden se completa. */
export function actualTotal(order: OrderFull): number | null {
  if (
    order.actualMaterialCost === null ||
    order.actualLaborCost === null ||
    order.actualOverheadCost === null
  ) {
    return null;
  }
  return round(order.actualMaterialCost + order.actualLaborCost + order.actualOverheadCost, 2);
}
