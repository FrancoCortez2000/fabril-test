/** Costo estándar de un producto (por unidad). `null` = todavía no se puede calcular (sin receta). */
export type ProductCostRow = {
  itemId: string;
  name: string;
  sku: string;
  materials: number | null;
  labor: number | null;
  overhead: number | null;
  standard: number | null;
  price: number | null;
  /** Puntos porcentuales sobre el precio de venta; `null` sin precio o sin costo. */
  margin: number | null;
};

/** Costo unitario planificado vs. real de una orden completada. */
export type OrderDeviationRow = {
  id: string;
  code: string;
  itemName: string;
  plannedUnit: number;
  actualUnit: number;
};
