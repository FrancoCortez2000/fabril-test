import { ClipboardList } from "lucide-react";
import Link from "next/link";

import type { BomView } from "@/features/items/bom-queries";
import { RequirementsView } from "@/features/items/components/requirements-view";

/**
 * Vista previa de materiales de una orden nueva: requerido, disponible y faltante según la receta,
 * en vivo. Sin receta o sin cantidad válida lo explica en lugar de mostrar una tabla vacía.
 */
export function MaterialsPreview({
  productId,
  bom,
  plannedQty,
}: {
  productId: string | null;
  bom: BomView | null;
  plannedQty: number | null;
}) {
  const valid = plannedQty !== null && Number.isFinite(plannedQty) && plannedQty > 0;

  return (
    <section aria-label="Materiales" className="space-y-3 rounded-lg border bg-surface p-5">
      <div>
        <h2 className="text-sm font-semibold">Materiales necesarios</h2>
        <p className="text-13 text-muted-foreground">
          Se calcula con la receta y lo que hay disponible hoy. Podés ver qué falta antes de
          planificar.
        </p>
      </div>

      {!productId ? (
        <p className="text-13 text-muted-foreground">Elegí un producto para ver sus materiales.</p>
      ) : !bom ? (
        <div className="flex flex-col items-start gap-2 rounded-md border border-dashed p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <ClipboardList aria-hidden className="size-4" />
            Este producto no tiene receta
          </p>
          <p className="text-13 text-muted-foreground">
            Sin receta no se puede calcular qué materiales hacen falta ni planificar la orden.
          </p>
          <Link
            href={`/app/productos/${productId}`}
            className="text-13 font-medium underline underline-offset-4"
          >
            Cargar la receta del producto
          </Link>
        </div>
      ) : valid ? (
        <RequirementsView bom={bom} qty={plannedQty} variant="order" />
      ) : (
        <p className="text-13 text-muted-foreground">
          Elegí una cantidad mayor a cero para ver los materiales.
        </p>
      )}
    </section>
  );
}
