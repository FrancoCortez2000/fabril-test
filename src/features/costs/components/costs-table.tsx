import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductCostRow } from "@/features/costs/types";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

const money = (v: number | null) => (v === null ? "—" : formatCurrency(v));

/** Costo estándar por unidad de cada producto, con precio y margen. Sin receta no hay costo. */
export function CostsTable({ products }: { products: ProductCostRow[] }) {
  if (products.length === 0) {
    return (
      <p className="rounded-lg border bg-surface px-5 py-10 text-center text-sm text-muted-foreground">
        Todavía no hay productos con receta
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead className="text-right">Materiales</TableHead>
            <TableHead className="text-right">Mano de obra</TableHead>
            <TableHead className="text-right">Indirectos</TableHead>
            <TableHead className="text-right">Costo estándar</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead className="text-right">Margen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => (
            <TableRow key={p.itemId}>
              <TableCell>
                <Link href={`/app/productos/${p.itemId}`} className="font-medium hover:underline">
                  {p.name}
                </Link>
                <span className="block font-mono text-xs text-muted-foreground">{p.sku}</span>
              </TableCell>
              <TableCell className="tabular text-right">{money(p.materials)}</TableCell>
              <TableCell className="tabular text-right">{money(p.labor)}</TableCell>
              <TableCell className="tabular text-right">{money(p.overhead)}</TableCell>
              <TableCell className="tabular text-right font-medium">{money(p.standard)}</TableCell>
              <TableCell className="tabular text-right">{money(p.price)}</TableCell>
              <TableCell className="tabular text-right">
                {p.standard === null ? (
                  <span className="text-muted-foreground">Sin receta</span>
                ) : p.margin === null ? (
                  "—"
                ) : (
                  <span className={cn(p.margin < 0 && "text-status-delayed")}>
                    {formatPercent(p.margin, 1)}
                    {p.margin < 0 ? (
                      <span className="block text-xs font-normal">Pierde plata</span>
                    ) : null}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
