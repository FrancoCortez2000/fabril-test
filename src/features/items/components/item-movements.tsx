import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { TableCard, TableCardEmpty } from "@/components/data/table-card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentReference } from "@/features/inventory/components/document-reference";
import { signedQuantity } from "@/features/inventory/format";
import { MOVEMENT_TYPE_LABELS, type MovementRow } from "@/features/inventory/types";
import { formatCurrency, formatDateTime, formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";

/** El motivo sin el código del documento, que ya se muestra al lado ("Consumo OP-…" → "Consumo"). */
function reasonWithoutReference(reason: string | null, reference: string | null): string | null {
  if (!reason) return null;
  const text = reference
    ? reason
        .replace(reference, "")
        .replace(/\s{2,}/g, " ")
        .trim()
    : reason;
  return text === "" ? null : text;
}

/** Kardex del ítem: cada movimiento con su saldo, de más nuevo a más viejo. */
export function ItemMovements({ rows }: { rows: MovementRow[] }) {
  const itemId = rows[0]?.itemId;
  return (
    <TableCard
      title="Movimientos"
      meta={rows.length > 0 ? `Últimos ${rows.length}` : undefined}
      actions={
        itemId ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/app/inventario/movimientos?item=${itemId}`}>
              Ver todos
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        ) : undefined
      }
    >
      {rows.length === 0 ? (
        <TableCardEmpty>Todavía no tiene movimientos de stock.</TableCardEmpty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead className="hidden md:table-cell">Tipo</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="hidden text-right md:table-cell">Costo unitario</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="hidden md:table-cell">Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((m) => {
              const inbound = m.quantity > 0;
              const typeLabel = MOVEMENT_TYPE_LABELS[m.type] ?? m.type;
              const reason = reasonWithoutReference(m.reason, m.reference);
              return (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(m.occurredAt)}
                    {/* En el celular el tipo va debajo de la fecha (la columna se oculta). */}
                    <span className="block text-xs text-foreground md:hidden">{typeLabel}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <span
                        aria-hidden
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          inbound ? "bg-status-completed" : "bg-muted-foreground/50",
                        )}
                      />
                      {typeLabel}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn("tabular font-medium", inbound && "text-status-completed")}>
                      {signedQuantity(m.quantity, m.unitCode)}
                    </span>
                  </TableCell>
                  <TableCell className="tabular hidden text-right text-muted-foreground md:table-cell">
                    {m.unitCost === null ? "—" : formatCurrency(m.unitCost)}
                  </TableCell>
                  <TableCell className="tabular text-right font-medium">
                    {m.balanceAfter === null ? "—" : formatQuantity(m.balanceAfter, m.unitCode)}
                  </TableCell>
                  <TableCell className="hidden space-x-2 md:table-cell">
                    <DocumentReference
                      reference={m.reference}
                      type={m.referenceType}
                      id={m.referenceId}
                    />
                    {reason ? (
                      <span className="text-13 text-muted-foreground">{reason}</span>
                    ) : null}
                    {m.reversed ? (
                      <span className="rounded-sm bg-surface-2 px-1.5 py-0.5 text-xs text-muted-foreground">
                        Revertido
                      </span>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </TableCard>
  );
}
