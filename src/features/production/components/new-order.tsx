import { PageHeader } from "@/components/data/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { listBoms } from "@/features/items/bom-queries";
import { OrderForm } from "@/features/production/components/order-form";
import { listEmployees, listProducibleItems } from "@/features/production/queries";
import { requireSession } from "@/lib/auth/session";

/**
 * Nueva orden de producción. Precarga productos, recetas y empleados de la fábrica activa para que la
 * vista previa de materiales sea instantánea. Lee la sesión: va siempre dentro de un `<Suspense>`.
 */
export async function NewOrder() {
  const session = await requireSession();
  const orgId = session.activeOrganizationId;
  const [products, boms, employees] = await Promise.all([
    listProducibleItems(orgId),
    listBoms(orgId),
    listEmployees(orgId),
  ]);

  return (
    <>
      <PageHeader
        title="Nueva orden"
        breadcrumbs={[{ label: "Producción", href: "/app/produccion" }, { label: "Nueva orden" }]}
        description="Elegí qué fabricar y cuánto: ves los materiales y los faltantes antes de planificar."
      />
      <OrderForm products={products} boms={boms} employees={employees} />
    </>
  );
}

export function NewOrderSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <Skeleton className="h-16 w-80" />
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}
