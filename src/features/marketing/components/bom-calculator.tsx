"use client";

import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { NumberInput } from "@/components/forms/number-input";
import { calculateMaterialRequirements, type BomLineInput } from "@/features/production/logic";
import { formatNumber, formatPercent, formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Receta de ejemplo: la misma regla de cálculo que usa el sistema (features/production/logic). */
const RECIPE: BomLineInput[] = [
  { itemId: "pead", name: "Polietileno AD", unitCode: "kg", quantity: 0.25, wastePct: null },
  { itemId: "mb-az", name: "Masterbatch azul", unitCode: "kg", quantity: 0.005, wastePct: null },
  { itemId: "etq", name: "Etiqueta frontal", unitCode: "u", quantity: 1, wastePct: 0 },
];
const STOCK: Record<string, number> = { pead: 200, "mb-az": 12, etq: 4500 };
const WASTE_PCT = 3;
const MAX_QTY = 1_000_000;

export function BomCalculator() {
  const [qty, setQty] = useState<number | null>(1000);
  const valid = qty !== null && Number.isInteger(qty) && qty >= 1 && qty <= MAX_QTY;
  const planned = valid ? qty : 0;
  const requirements = calculateMaterialRequirements({
    plannedQty: planned,
    outputQty: 1,
    defaultWastePct: WASTE_PCT,
    lines: RECIPE,
    stock: STOCK,
  });
  const shortages = requirements.filter((r) => r.shortage > 0);

  return (
    <div className="overflow-hidden rounded-xl border bg-surface shadow-[0_1px_0_rgba(0,0,0,0.02),0_12px_32px_-16px_rgba(28,33,39,0.25)]">
      <div className="flex items-center justify-between gap-3 border-b bg-surface-2/60 px-5 py-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Nueva orden de producción</p>
          <p className="truncate font-medium">Bidón 5 L azul</p>
        </div>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">BID-5L-AZ</span>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="w-44 space-y-1.5">
            <label htmlFor="calc-qty" className="text-13 font-medium">
              Cantidad a fabricar
            </label>
            <NumberInput
              id="calc-qty"
              value={qty}
              onChange={setQty}
              unit="u"
              aria-invalid={!valid}
              aria-describedby="calc-status"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Receta por unidad · desperdicio previsto {formatPercent(WASTE_PCT)}
          </p>
        </div>

        <table className="w-full text-13">
          <caption className="sr-only">Materiales necesarios para la orden</caption>
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 text-left font-medium">Material</th>
              <th className="py-2 text-right font-medium">Necesario</th>
              <th className="py-2 text-right font-medium">En stock</th>
              <th className="py-2 text-right font-medium">Falta</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {requirements.map((r) => (
              <tr key={r.itemId} className="border-b last:border-0">
                <th scope="row" className="py-2.5 text-left font-normal">
                  {r.name}
                </th>
                <td className="py-2.5 text-right">
                  {valid ? formatQuantity(r.required, r.unitCode) : "—"}
                </td>
                <td className="py-2.5 text-right text-muted-foreground">
                  {formatQuantity(r.available, r.unitCode)}
                </td>
                <td
                  className={cn(
                    "py-2.5 text-right",
                    valid && r.shortage > 0
                      ? "font-semibold text-status-delayed"
                      : "text-muted-foreground",
                  )}
                >
                  {valid && r.shortage > 0 ? formatQuantity(r.shortage, r.unitCode) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          id="calc-status"
          role="status"
          aria-live="polite"
          className={cn(
            "flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-13",
            !valid
              ? "border-border bg-surface-2/60"
              : shortages.length
                ? "border-status-delayed/30 bg-status-delayed/5"
                : "border-status-completed/30 bg-status-completed/5",
          )}
        >
          {!valid ? (
            <>
              <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p>
                Ingresá una cantidad entera entre 1 y {formatNumber(MAX_QTY)} para calcular los
                materiales.
              </p>
            </>
          ) : shortages.length ? (
            <>
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-status-delayed" />
              <p>
                {shortages
                  .map((s) => `Faltan ${formatQuantity(s.shortage, s.unitCode)} de ${s.name}`)
                  .join(" · ")}
                . FABRIL arma la orden de compra con lo que falta.
              </p>
            </>
          ) : (
            <>
              <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-status-completed" />
              <p>Hay material suficiente para fabricar esta cantidad.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
