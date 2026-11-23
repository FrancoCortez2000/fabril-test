import type { OrderMaterial } from "@/features/production/types";

/**
 * Materiales que faltan para una orden planificada: los que tienen disponible negativo (el stock no
 * alcanza para todo lo comprometido). Es la misma regla con la que la base arma la compra de faltantes.
 */
export function orderShortages(
  materials: OrderMaterial[],
): (OrderMaterial & { shortage: number })[] {
  return materials
    .filter((m) => m.available < 0)
    .map((m) => ({ ...m, shortage: Math.round(-m.available * 1000) / 1000 }));
}
