/**
 * Cálculo de materiales a partir de la receta (BOM).
 * Regla (docs/plan-tecnico.md §5.3):
 *   requerido = cantidad × (cantidad_por_receta / rendimiento) × (1 + desperdicio %)
 * La misma regla se implementa en SQL para el cálculo definitivo (Etapa 3).
 */

export type BomLineInput = {
  itemId: string;
  name: string;
  unitCode: string;
  /** Cantidad del material por `outputQty` unidades de producto. */
  quantity: number;
  /** Desperdicio propio del material; `null` usa el de la receta. */
  wastePct: number | null;
};

export type MaterialRequirement = {
  itemId: string;
  name: string;
  unitCode: string;
  required: number;
  available: number;
  shortage: number;
};

export function round3(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

export function calculateMaterialRequirements(args: {
  plannedQty: number;
  outputQty: number;
  defaultWastePct: number;
  lines: BomLineInput[];
  stock: Record<string, number>;
}): MaterialRequirement[] {
  const { plannedQty, outputQty, defaultWastePct, lines, stock } = args;

  return lines.map((line) => {
    const wastePct = line.wastePct ?? defaultWastePct;
    const required = round3(((plannedQty * line.quantity) / outputQty) * (1 + wastePct / 100));
    const available = stock[line.itemId] ?? 0;
    return {
      itemId: line.itemId,
      name: line.name,
      unitCode: line.unitCode,
      required,
      available,
      shortage: round3(Math.max(0, required - available)),
    };
  });
}
