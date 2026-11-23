import Link from "next/link";

import { StatusBadge } from "@/components/data/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PurchaseLineDetail, PurchaseRow } from "@/features/purchasing/types";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

/** Ficha de una compra: datos, líneas (pedido / recibido / pendiente) y totales con IVA. */
export function PurchaseDetail({
  purchase,
  lines,
}: {
  purchase: PurchaseRow;
  lines: PurchaseLineDetail[];
}) {
  return (
    <div className="space-y-6">
      <dl className="grid gap-4 rounded-lg border bg-surface p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Proveedor">{purchase.supplierName}</Field>
        <Field label="Estado">
          <StatusBadge kind="purchase" status={purchase.status} />
        </Field>
        <Field label="Fecha del pedido">{formatDate(purchase.orderDate)}</Field>
        <Field label="Entrega esperada">
          {purchase.expectedDate ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              <span>{formatDate(purchase.expectedDate)}</span>
              {purchase.isLate ? (
                <span className="rounded-sm bg-status-delayed/10 px-1.5 py-0.5 text-xs font-medium text-status-delayed">
                  Entrega vencida
                </span>
              ) : null}
            </span>
          ) : (
            "—"
          )}
        </Field>
      </dl>

      {purchase.status === "cancelled" && purchase.cancelReason ? (
        <p className="rounded-md border bg-surface-2 px-4 py-3 text-13">
          <span className="font-medium">Motivo de la cancelación:</span> {purchase.cancelReason}
        </p>
      ) : null}
      {purchase.notes ? <p className="text-13 text-muted-foreground">{purchase.notes}</p> : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Materiales</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead className="text-right">Pedido</TableHead>
              <TableHead className="text-right">Recibido</TableHead>
              <TableHead className="text-right">Pendiente</TableHead>
              <TableHead className="hidden text-right md:table-cell">Precio</TableHead>
              <TableHead className="hidden text-right md:table-cell">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  <Link href={`/app/materias-primas/${l.itemId}`} className="hover:underline">
                    <span className="block font-medium">{l.itemName}</span>
                    <span className="block font-mono text-xs text-muted-foreground">{l.sku}</span>
                  </Link>
                </TableCell>
                <TableCell className="tabular text-right">
                  {formatQuantity(l.quantity, l.unitCode)}
                </TableCell>
                <TableCell className="tabular text-right">
                  {formatQuantity(l.receivedQty, l.unitCode)}
                </TableCell>
                <TableCell className="tabular text-right">
                  {formatQuantity(l.pendingQty, l.unitCode)}
                </TableCell>
                <TableCell className="tabular hidden text-right md:table-cell">
                  {formatCurrency(l.unitPrice)}
                </TableCell>
                <TableCell className="tabular hidden text-right md:table-cell">
                  {formatCurrency(l.lineTotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section aria-label="Totales" className="ml-auto max-w-xs space-y-1.5 text-sm">
        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular">{formatCurrency(purchase.subtotal)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">IVA</span>
          <span className="tabular">{formatCurrency(purchase.taxTotal)}</span>
        </div>
        <div className="flex justify-between gap-6 border-t pt-2 font-semibold">
          <span>Total</span>
          <span className="tabular">{formatCurrency(purchase.total)}</span>
        </div>
      </section>
    </div>
  );
}
