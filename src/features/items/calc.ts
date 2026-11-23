/** Margen sobre el precio de venta, en %: (precio − costo estándar) / precio. Nulo si no se puede calcular. */
export function marginPct(salePrice: number | null, standardCost: number | null): number | null {
  if (salePrice === null || standardCost === null || salePrice <= 0) return null;
  return ((salePrice - standardCost) / salePrice) * 100;
}
