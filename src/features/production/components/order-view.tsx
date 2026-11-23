import { notFound } from "next/navigation";

import { PageHeader } from "@/components/data/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { listSuppliers } from "@/features/items/detail-queries";
import { OrderActions } from "@/features/production/components/order-actions";
import { OrderDetail } from "@/features/production/components/order-detail";
import { getOrder } from "@/features/production/queries";
import { requireSession } from "@/lib/auth/session";

/**
 * Ficha de una orden de producción de la fábrica activa. Lee la sesión y los parámetros de la ruta
 * (datos del request): va siempre dentro de un `<Suspense>`. Un id de otra fábrica es un 404.
 */
export async function OrderView({ id }: { id: string }) {
  const session = await requireSession();
  const orgId = session.activeOrganizationId;
  const data = await getOrder(orgId, id);
  if (!data) notFound();
  // Los proveedores sólo se usan para "Crear compra con faltantes" (órdenes planificadas).
  const suppliers = data.order.status === "planned" ? await listSuppliers(orgId) : [];

  return (
    <>
      <PageHeader
        title={data.order.code}
        breadcrumbs={[{ label: "Producción", href: "/app/produccion" }, { label: data.order.code }]}
        description={`Orden de producción de ${data.order.itemName}.`}
        actions={
          <OrderActions order={data.order} materials={data.materials} suppliers={suppliers} />
        }
      />
      <OrderDetail data={data} />
    </>
  );
}

export function OrderViewSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <Skeleton className="h-16 w-80" />
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="h-72 rounded-lg" />
    </div>
  );
}
