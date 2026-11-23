"use client";

import { useState } from "react";

import { NumberInput } from "@/components/forms/number-input";
import { Label } from "@/components/ui/label";
import type { BomView } from "@/features/items/bom-queries";
import { RequirementsView } from "@/features/items/components/requirements-view";

/**
 * "Para fabricar N": materiales requeridos, disponibles y faltantes según la receta. Usa la misma
 * regla que la base al planificar una orden (`calculateMaterialRequirements`).
 */
export function BomCalculatorPanel({ bom, productUnit }: { bom: BomView; productUnit: string }) {
  const [qty, setQty] = useState<number | null>(100);
  const valid = qty !== null && Number.isFinite(qty) && qty > 0;

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
        <RequirementsView bom={bom} qty={qty} variant="calculator" />
      ) : (
        <p className="text-13 text-muted-foreground">
          Ingresá una cantidad mayor a cero para ver los materiales.
        </p>
      )}
    </section>
  );
}
