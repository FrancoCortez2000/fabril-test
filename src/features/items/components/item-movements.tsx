import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MOVEMENT_TYPE_LABELS, type MovementRow } from "@/features/inventory/types";
import { formatCurrency, formatDateTime, formatQuantity } from "@/lib/format";

function signed(quantity: number, unitCode: string): string {
  return `${quantity > 0 ? "+" : ""}${formatQuantity(quantity, unitCode)}`;
}

/** Kardex del ítem: cada movimiento con su saldo, de más nuevo a más viejo. */
export function ItemMovements({ rows }: { rows: MovementRow[] }) {
  if (rows.length === 0) {
    return <p className="text-13 text-muted-foreground">Todavía no tiene movimientos de stock.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right">Cantidad</TableHead>
          <TableHead className="hidden text-right md:table-cell">Costo unitario</TableHead>
          <TableHead className="text-right">Saldo</TableHead>
          <TableHead>Detalle</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((m) => (
          <TableRow key={m.id}>
            <TableCell className="whitespace-nowrap">{formatDateTime(m.occurredAt)}</TableCell>
            <TableCell>{MOVEMENT_TYPE_LABELS[m.type] ?? m.type}</TableCell>
            <TableCell className="tabular text-right">{signed(m.quantity, m.unitCode)}</TableCell>
            <TableCell className="tabular hidden text-right md:table-cell">
              {m.unitCost === null ? "—" : formatCurrency(m.unitCost)}
            </TableCell>
            <TableCell className="tabular text-right">
              {m.balanceAfter === null ? "—" : formatQuantity(m.balanceAfter, m.unitCode)}
            </TableCell>
            <TableCell className="space-x-2">
              {m.reference ? <span className="font-mono text-xs">{m.reference}</span> : null}
              {m.reason ? <span className="text-13">{m.reason}</span> : null}
              {m.reversed ? (
                <span className="rounded-sm bg-surface-2 px-1.5 py-0.5 text-xs text-muted-foreground">
                  Revertido
                </span>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
