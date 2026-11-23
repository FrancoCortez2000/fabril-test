import { CostsTable } from "@/features/costs/components/costs-table";
import { DeviationTable } from "@/features/costs/components/deviation-table";
import { getCosts } from "@/features/costs/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSession } from "@/lib/auth/session";

/**
 * Pantalla de Costos de la fábrica activa: costo estándar por producto y desvío de las últimas
 * órdenes completadas. Lee la sesión (datos del request): va dentro de un `<Suspense>`.
 */
export async function CostsView() {
  const session = await requireSession();
  const { products, deviations } = await getCosts(session.activeOrganizationId);
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Costo estándar por producto</h2>
        <p className="text-13 text-muted-foreground">
          Por unidad, con los materiales a costo promedio, la mano de obra y los gastos indirectos.
        </p>
        <CostsTable products={products} />
      </section>
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Planificado vs. real</h2>
        <p className="text-13 text-muted-foreground">
          Costo unitario de las últimas órdenes completadas.
        </p>
        <DeviationTable deviations={deviations} />
      </section>
    </div>
  );
}

export function CostsViewSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <Skeleton className="h-72 w-full rounded-lg" />
      <Skeleton className="h-56 w-full rounded-lg" />
    </div>
  );
}
