import { notFound } from "next/navigation";

import { PageHeader } from "@/components/data/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { PurchaseActions } from "@/features/purchasing/components/purchase-actions";
import { PurchaseDetail } from "@/features/purchasing/components/purchase-detail";
import { getPurchase } from "@/features/purchasing/queries";
import { requireSession } from "@/lib/auth/session";

/**
 * Ficha de una compra de la fábrica activa. Lee la sesión y los parámetros de la ruta (datos del
 * request): va siempre dentro de un `<Suspense>`. Un id de otra fábrica es un 404.
 */
export async function PurchaseView({ id }: { id: string }) {
  const session = await requireSession();
  const found = await getPurchase(session.activeOrganizationId, id);
  if (!found) notFound();
  const { purchase, lines } = found;

  return (
    <>
      <PageHeader
        title={purchase.code}
        breadcrumbs={[{ label: "Compras", href: "/app/compras" }, { label: purchase.code }]}
        description={`Orden de compra a ${purchase.supplierName}.`}
        actions={<PurchaseActions purchase={purchase} lines={lines} />}
      />
      <PurchaseDetail purchase={purchase} lines={lines} />
    </>
  );
}

export function PurchaseViewSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <Skeleton className="h-16 w-80" />
      <Skeleton className="h-28 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}
