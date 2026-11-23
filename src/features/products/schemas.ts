/** Unidades de sistema (docs/plan-tecnico.md §4.2). */
export const UNIT_CODES = ["u", "kg", "g", "l", "ml", "m", "m2"] as const;
export type UnitCode = (typeof UNIT_CODES)[number];

export const UNIT_LABELS: Record<UnitCode, string> = {
  u: "Unidad (u)",
  kg: "Kilogramo (kg)",
  g: "Gramo (g)",
  l: "Litro (l)",
  ml: "Mililitro (ml)",
  m: "Metro (m)",
  m2: "Metro cuadrado (m²)",
};

export const PRODUCT_STATUSES = ["active", "inactive"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
