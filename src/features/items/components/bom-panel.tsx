"use client";

import { ClipboardList, Pencil } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BomView, RawMaterialOption } from "@/features/items/bom-queries";
import { BomCalculatorPanel } from "@/features/items/components/bom-calculator-panel";
import { BomEditorDialog } from "@/features/items/components/bom-editor-dialog";
import { calculateMaterialRequirements } from "@/features/production/logic";
import { formatCurrency, formatPercent, formatQuantity } from "@/lib/format";

/** Receta del producto: ver, editar y calcular materiales. */
export function BomPanel({
  itemId,
  productUnit,
  bom,
  materials,
}: {
  itemId: string;
  productUnit: string;
  bom: BomView | null;
  materials: RawMaterialOption[];
}) {
  const [editing, setEditing] = useState(false);

  const initialValues = bom
    ? {
        outputQty: bom.outputQty,
        defaultWastePct: bom.defaultWastePct,
        notes: bom.notes ?? "",
        lines: bom.lines.map((l) => ({
          componentItemId: l.itemId,
          quantity: l.quantity,
          wastePct: l.wastePct,
        })),
      }
    : null;

  // Costo de cada línea por unidad de producto (misma regla que el costo estándar de la base).
  const perUnit = bom
    ? calculateMaterialRequirements({
        plannedQty: 1,
        outputQty: bom.outputQty,
        defaultWastePct: bom.defaultWastePct ?? bom.orgWastePct,
        lines: bom.lines,
        stock: {},
      })
    : [];

  return (
    <section aria-label="Receta" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Receta</h2>
        <Button variant="outline" onClick={() => setEditing(true)}>
          <Pencil aria-hidden />
          {bom ? "Editar receta" : "Crear receta"}
        </Button>
      </div>

      {bom ? (
        <>
          <p className="text-13 text-muted-foreground">
            Rinde {formatQuantity(bom.outputQty, productUnit)}. Desperdicio por defecto:{" "}
            {formatPercent(bom.defaultWastePct ?? bom.orgWastePct)}
            {bom.defaultWastePct === null ? " (el de la fábrica)" : ""}.
            {bom.notes ? ` ${bom.notes}` : ""}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Materia prima</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Desperdicio</TableHead>
                <TableHead className="text-right">Costo por unidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bom.lines.map((l, i) => {
                const required = perUnit[i]?.required ?? 0;
                return (
                  <TableRow key={l.itemId}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="tabular text-right">
                      {formatQuantity(l.quantity, l.unitCode)}
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {l.wastePct === null ? "—" : formatPercent(l.wastePct)}
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {formatCurrency(Math.round(required * l.avgCost * 100) / 100)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <BomCalculatorPanel bom={bom} productUnit={productUnit} />
        </>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="Este producto todavía no tiene receta"
          description="Cargá las materias primas que lleva para calcular su costo estándar y planificar su fabricación."
        />
      )}

      <BomEditorDialog
        open={editing}
        onOpenChange={setEditing}
        itemId={itemId}
        initialValues={initialValues}
        materials={materials}
      />
    </section>
  );
}
