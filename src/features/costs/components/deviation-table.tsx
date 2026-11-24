import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OrderDeviationRow } from "@/features/costs/types";
import { Variance } from "@/features/production/components/variance";
import { formatCurrency } from "@/lib/format";

/** Costo unitario planificado vs. real de las últimas órdenes completadas. */
export function DeviationTable({ deviations }: { deviations: OrderDeviationRow[] }) {
  if (deviations.length === 0) {
    return (
      <p className="rounded-lg border bg-surface px-5 py-10 text-center text-sm text-muted-foreground">
        Todavía no hay órdenes completadas
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Orden</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead className="text-right">Unitario planificado</TableHead>
            <TableHead className="text-right">Unitario real</TableHead>
            <TableHead className="text-right">Desvío</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deviations.map((d) => (
            <TableRow key={d.id}>
              <TableCell>
                <Link href={`/app/produccion/${d.id}`} className="font-medium hover:underline">
                  {d.code}
                </Link>
              </TableCell>
              <TableCell>{d.itemName}</TableCell>
              <TableCell className="tabular text-right">{formatCurrency(d.plannedUnit)}</TableCell>
              <TableCell className="tabular text-right">{formatCurrency(d.actualUnit)}</TableCell>
              <TableCell className="tabular text-right">
                <Variance planned={d.plannedUnit} actual={d.actualUnit} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
