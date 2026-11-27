import Link from "next/link";

import { StatusBadge } from "@/components/data/status-badge";
import { TableCard, TableCardEmpty } from "@/components/data/table-card";
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

const codeLink = "font-mono text-13 font-medium underline-offset-4 hover:underline";

/** Productos cuya receta lleva la materia prima. */
export function UsedIn({ rows, unitCode }: { rows: UsedInRow[]; unitCode: string }) {
  return (
    <TableCard title="Usado en" meta={rows.length > 0 ? `${rows.length} productos` : undefined}>
      {rows.length === 0 ? (
        <TableCardEmpty>No se usa en ninguna receta todavía.</TableCardEmpty>
      ) : (
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.productId} className="flex items-center justify-between gap-4 px-5 py-3">
              <Link href={`/app/productos/${r.productId}`} className="min-w-0 hover:underline">
                <span className="block truncate text-sm font-medium">{r.productName}</span>
                <span className="block font-mono text-xs text-muted-foreground">
                  {r.productSku}
                </span>
              </Link>
              <span className="tabular shrink-0 text-13 text-muted-foreground">
                {formatQuantity(r.quantity, unitCode)} por {formatNumber(r.outputQty)}{" "}
                {r.outputQty === 1 ? "unidad" : "unidades"}
                {r.wastePct === null ? "" : ` · desperdicio ${formatPercent(r.wastePct)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </TableCard>
  );
}

/** Últimas compras de la materia prima, cada una enlazada a su ficha. */
export function PurchaseHistory({ rows, unitCode }: { rows: PurchaseLineRow[]; unitCode: string }) {
  return (
    <TableCard
      title="Compras recientes"
      meta={rows.length > 0 ? `Últimas ${rows.length}` : undefined}
    >
      {rows.length === 0 ? (
        <TableCardEmpty>Todavía no se compró.</TableCardEmpty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Orden</TableHead>
              <TableHead className="hidden md:table-cell">Proveedor</TableHead>
              <TableHead className="hidden sm:table-cell">Fecha</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Precio unitario</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.purchaseId}>
                <TableCell>
                  <Link href={`/app/compras/${r.purchaseId}`} className={codeLink}>
                    {r.code}
                  </Link>
                </TableCell>
                <TableCell className="hidden md:table-cell">{r.supplierName}</TableCell>
                <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                  {formatDate(r.orderDate)}
                </TableCell>
                <TableCell className="tabular text-right">
                  {formatQuantity(r.quantity, unitCode)}
                </TableCell>
                <TableCell className="tabular hidden text-right sm:table-cell">
                  {formatCurrency(r.unitPrice)}
                </TableCell>
                <TableCell>
                  <StatusBadge kind="purchase" status={r.status as PurchaseStatus} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </TableCard>
  );
}

/** Últimas órdenes de producción del producto, cada una enlazada a su ficha. */
export function ProductOrders({ rows, unitCode }: { rows: ProductOrderRow[]; unitCode: string }) {
  return (
    <TableCard
      title="Órdenes de producción"
      meta={rows.length > 0 ? `Últimas ${rows.length}` : undefined}
    >
      {rows.length === 0 ? (
        <TableCardEmpty>Todavía no tiene órdenes de producción.</TableCardEmpty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Orden</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Producido</TableHead>
              <TableHead className="hidden sm:table-cell">Fin previsto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={`/app/produccion/${r.id}`} className={codeLink}>
                    {r.code}
                  </Link>
                </TableCell>
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
                <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                  {r.plannedEndDate ? formatDate(r.plannedEndDate) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </TableCard>
  );
}
