export type StockLevel = "ok" | "low" | "out";

export const STOCK_LEVEL_LABELS: Record<StockLevel, string> = {
  ok: "Normal",
  low: "Stock bajo",
  out: "Sin stock",
};

/** Nivel de stock respecto del mínimo configurado. */
export function stockLevel(current: number, minStock: number): StockLevel {
  if (current <= 0) return "out";
  if (current < minStock) return "low";
  return "ok";
}
