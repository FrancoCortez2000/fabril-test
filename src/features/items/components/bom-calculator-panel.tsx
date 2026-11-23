"use client";

import { useState } from "react";

import { NumberInput } from "@/components/forms/number-input";
import { Label } from "@/components/ui/label";
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
 * "Para fabricar N": materiales requeridos, disponibles y faltantes según la receta. Usa la misma
 * regla que la base al planificar una orden (`calculateMaterialRequirements`).
 */
export function BomCalculatorPanel({ bom, productUnit }: { bom: BomView; productUnit: string }) {
  const [qty, setQty] = useState<number | null>(100);
  const valid = qty !== null && Number.isFinite(qty) && qty > 0;

  const rows = valid
    ? calculateMaterialRequirements({
        plannedQty: qty,
        outputQty: bom.outputQty,
        defaultWastePct: bom.defaultWastePct ?? bom.orgWastePct,
        lines: bom.lines,
        stock: Object.fromEntries(bom.lines.map((l) => [l.itemId, l.available])),
      }).map((r) => ({
        ...r,
        cost:
          Math.round(
            r.required * (bom.lines.find((l) => l.itemId === r.itemId)?.avgCost ?? 0) * 100,
          ) / 100,
      }))
    : [];
  const missing = rows.filter((r) => r.shortage > 0);
  const total = rows.reduce((sum, r) => sum + r.cost, 0);

  return (
    <section
      aria-label="Calculadora de materiales"
      className="space-y-3 rounded-lg border bg-surface p-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">Calculadora de materiales</h3>
          <p className="text-13 text-muted-foreground">
            ¿Qué hace falta para fabricar una cantidad? Se calcula con la receta y el stock
            disponible.
          </p>
        </div>
        <div className="w-48 space-y-1.5">
          <Label htmlFor="bom-calc-qty">Cantidad a fabricar</Label>
          <NumberInput
            id="bom-calc-qty"
            aria-label="Cantidad a fabricar"
            value={qty}
            onChange={setQty}
            unit={productUnit}
          />
        </div>
      </div>

      {valid ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Materia prima</TableHead>
                <TableHead className="text-right">Requerido</TableHead>
                <TableHead className="text-right">Disponible</TableHead>
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
                  <TableCell className="tabular text-right">
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
            <p
              className={
                missing.length ? "font-medium text-status-delayed" : "text-muted-foreground"
              }
            >
              {missing.length
                ? `Falta comprar ${missing.length} ${missing.length === 1 ? "materia prima" : "materias primas"}.`
                : "Alcanza con lo que hay disponible."}
            </p>
            <p>
              Costo de materiales:{" "}
              <span className="tabular font-semibold">{formatCurrency(total)}</span>
            </p>
          </div>
        </>
      ) : (
        <p className="text-13 text-muted-foreground">
          Ingresá una cantidad mayor a cero para ver los materiales.
        </p>
      )}
    </section>
  );
}
