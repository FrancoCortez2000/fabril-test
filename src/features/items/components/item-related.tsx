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
import type { ProductOrderRow, PurchaseLineRow, UsedInRow } from "@/features/items/detail-queries";
import type { ProductionStatus, PurchaseStatus } from "@/lib/domain/status";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  formatQuantity,
} from "@/lib/format";

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="text-13 text-muted-foreground">{children}</p>
);

/** Productos cuya receta lleva la materia prima. */
export function UsedIn({ rows, unitCode }: { rows: UsedInRow[]; unitCode: string }) {
  if (rows.length === 0) return <Empty>No se usa en ninguna receta todavía.</Empty>;
  return (
    <ul className="divide-y rounded-lg border bg-surface">
      {rows.map((r) => (
        <li key={r.productId} className="flex items-center justify-between gap-4 px-4 py-3">
          <Link href={`/app/productos/${r.productId}`} className="min-w-0 hover:underline">
            <span className="block truncate text-sm font-medium">{r.productName}</span>
            <span className="block font-mono text-xs text-muted-foreground">{r.productSku}</span>
          </Link>
          <span className="tabular shrink-0 text-13 text-muted-foreground">
            {formatQuantity(r.quantity, unitCode)} por {formatNumber(r.outputQty)}{" "}
            {r.outputQty === 1 ? "unidad" : "unidades"}
            {r.wastePct === null ? "" : ` · desperdicio ${formatPercent(r.wastePct)}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Últimas compras de la materia prima (el enlace a cada orden llega con el módulo de Compras). */
export function PurchaseHistory({ rows, unitCode }: { rows: PurchaseLineRow[]; unitCode: string }) {
  if (rows.length === 0) return <Empty>Todavía no se compró.</Empty>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Orden</TableHead>
          <TableHead>Proveedor</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead className="text-right">Cantidad</TableHead>
          <TableHead className="text-right">Precio unitario</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.purchaseId}>
            <TableCell className="font-mono text-xs">
              <Link
                href={`/app/compras/${r.purchaseId}`}
                className="underline-offset-4 hover:underline"
              >
                {r.code}
              </Link>
            </TableCell>
            <TableCell>{r.supplierName}</TableCell>
            <TableCell className="whitespace-nowrap">{formatDate(r.orderDate)}</TableCell>
            <TableCell className="tabular text-right">
              {formatQuantity(r.quantity, unitCode)}
            </TableCell>
            <TableCell className="tabular text-right">{formatCurrency(r.unitPrice)}</TableCell>
            <TableCell>
              <StatusBadge kind="purchase" status={r.status as PurchaseStatus} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Últimas órdenes de producción del producto (el enlace a cada orden llega con Producción). */
export function ProductOrders({ rows, unitCode }: { rows: ProductOrderRow[]; unitCode: string }) {
  if (rows.length === 0) return <Empty>Todavía no tiene órdenes de producción.</Empty>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Orden</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Producido</TableHead>
          <TableHead>Fin previsto</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-mono text-xs">{r.code}</TableCell>
            <TableCell>
              <StatusBadge
                kind="production"
                status={r.status as ProductionStatus}
                delayed={r.isDelayed}
              />
            </TableCell>
            <TableCell className="tabular text-right">
              {`${formatNumber(r.goodQty)} / ${formatQuantity(r.plannedQty, unitCode)}`}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {r.plannedEndDate ? formatDate(r.plannedEndDate) : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
