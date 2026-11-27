import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BomView } from "@/features/items/bom-queries";
import { calculateMaterialRequirements } from "@/features/production/logic";
import { formatCurrency, formatQuantity } from "@/lib/format";

/**
 * Materiales requeridos, disponibles y faltantes para fabricar `qty` unidades según la receta (misma
 * regla que la base al planificar una orden). `qty` tiene que ser un número mayor a cero.
 */
export function RequirementsView({
  bom,
  qty,
  variant,
}: {
  bom: BomView;
  qty: number;
  /** `calculator`: calculadora de la ficha. `order`: vista previa de una orden nueva. */
  variant: "calculator" | "order";
}) {
  const rows = calculateMaterialRequirements({
    plannedQty: qty,
    outputQty: bom.outputQty,
    defaultWastePct: bom.defaultWastePct ?? bom.orgWastePct,
    lines: bom.lines,
    stock: Object.fromEntries(bom.lines.map((l) => [l.itemId, l.available])),
  }).map((r) => ({
    ...r,
    cost:
      Math.round(r.required * (bom.lines.find((l) => l.itemId === r.itemId)?.avgCost ?? 0) * 100) /
      100,
  }));
  const missing = rows.filter((r) => r.shortage > 0);
  const total = rows.reduce((sum, r) => sum + r.cost, 0);
  const noun = missing.length === 1 ? "materia prima" : "materias primas";

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Materia prima</TableHead>
            <TableHead className="text-right">Requerido</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Disponible</TableHead>
            <TableHead className="text-right">Faltante</TableHead>
            <TableHead className="hidden text-right md:table-cell">Costo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.itemId}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell className="tabular text-right">
                {formatQuantity(r.required, r.unitCode)}
              </TableCell>
              <TableCell className="tabular hidden text-right sm:table-cell">
                {formatQuantity(r.available, r.unitCode)}
              </TableCell>
              <TableCell className="tabular text-right">
                {r.shortage > 0 ? (
                  <span className="inline-flex items-center gap-2">
                    {formatQuantity(r.shortage, r.unitCode)}
                    <span className="rounded-sm bg-status-delayed/10 px-1.5 py-0.5 text-[11px] font-medium text-status-delayed">
                      Falta
                    </span>
                  </span>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="tabular hidden text-right md:table-cell">
                {formatCurrency(r.cost)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex flex-wrap items-baseline justify-between gap-3 text-13">
        <p className={missing.length ? "font-medium text-status-delayed" : "text-muted-foreground"}>
          {missing.length
            ? variant === "order"
              ? `Faltan ${missing.length} ${noun}: la compra se crea desde la orden.`
              : `Falta comprar ${missing.length} ${noun}.`
            : "Alcanza con lo que hay disponible."}
        </p>
        <p>
          Costo de materiales:{" "}
          <span className="tabular font-semibold">{formatCurrency(total)}</span>
        </p>
      </div>
    </>
  );
}
