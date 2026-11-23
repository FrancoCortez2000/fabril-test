/** Fila del historial de movimientos de stock (vista `movement_feed`). */
export type MovementRow = {
  id: string;
  /** Instante ISO. */
  occurredAt: string;
  itemId: string;
  itemName: string;
  sku: string;
  unitCode: string;
  type: string;
  quantity: number;
  unitCost: number | null;
  totalCost: number | null;
  balanceAfter: number | null;
  reason: string | null;
  /** Código de la orden de compra o de producción de origen (sólo texto hasta el bloque 4B). */
  reference: string | null;
  /** Tipo y id del documento de origen, para enlazar a su ficha. */
  referenceType: "purchase_order" | "production_order" | null;
  referenceId: string | null;
  /** Se puede revertir a mano: movimiento manual o ajuste que nadie revirtió. */
  reversible: boolean;
  reversed: boolean;
};

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  purchase_receipt: "Compra recibida",
  production_output: "Ingreso de producción",
  production_consumption: "Consumo de producción",
  production_return: "Devolución a stock",
  production_scrap: "Merma",
  adjustment: "Ajuste por conteo",
  manual_in: "Entrada manual",
  manual_out: "Salida manual",
  reversal: "Reversión",
};
