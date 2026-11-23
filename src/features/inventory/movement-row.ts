import type { MovementRow } from "@/features/inventory/types";

/** Fila de la vista `movement_feed` tal como llega de la base. */
export type FeedRow = {
  id: string;
  item_id: string;
  item_name: string;
  item_sku: string;
  unit_code: string;
  movement_type: string;
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  balance_after: number | null;
  reason: string | null;
  occurred_at: string;
  reference: string | null;
  reference_type: string | null;
  reference_id: string | null;
  reversible: boolean | null;
  reversed: boolean | null;
};

export function toMovementRow(r: FeedRow): MovementRow {
  return {
    id: r.id,
    occurredAt: r.occurred_at,
    itemId: r.item_id,
    itemName: r.item_name,
    sku: r.item_sku,
    unitCode: r.unit_code,
    type: r.movement_type,
    quantity: Number(r.quantity),
    unitCost: r.unit_cost === null ? null : Number(r.unit_cost),
    totalCost: r.total_cost === null ? null : Number(r.total_cost),
    balanceAfter: r.balance_after === null ? null : Number(r.balance_after),
    reason: r.reason,
    reference: r.reference,
    referenceType:
      r.reference_type === "purchase_order" || r.reference_type === "production_order"
        ? r.reference_type
        : null,
    referenceId: r.reference_id,
    reversible: Boolean(r.reversible),
    reversed: Boolean(r.reversed),
  };
}
