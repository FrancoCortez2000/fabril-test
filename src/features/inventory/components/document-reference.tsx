import Link from "next/link";

import type { MovementRow } from "@/features/inventory/types";

const BASE: Record<NonNullable<MovementRow["referenceType"]>, string> = {
  purchase_order: "/app/compras",
  production_order: "/app/produccion",
};

/** Código del documento de origen de un movimiento (compra u orden), con enlace a su ficha. */
export function DocumentReference({
  reference,
  type,
  id,
}: {
  reference: string | null;
  type: MovementRow["referenceType"];
  id: string | null;
}) {
  if (!reference) return null;
  if (!type || !id) return <span className="font-mono text-xs">{reference}</span>;
  return (
    <Link
      href={`${BASE[type]}/${id}`}
      className="font-mono text-xs underline-offset-4 hover:underline"
    >
      {reference}
    </Link>
  );
}
