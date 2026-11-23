import { notFound } from "next/navigation";

import { PageHeader } from "@/components/data/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getItem,
  listItemMovements,
  listProductOrders,
  listRecentPurchases,
  listSuppliers,
  listUsedIn,
} from "@/features/items/detail-queries";
import { ItemActions } from "@/features/items/components/item-actions";
import { ItemMovements } from "@/features/items/components/item-movements";
import { ProductOrders, PurchaseHistory, UsedIn } from "@/features/items/components/item-related";
import { ItemSummary } from "@/features/items/components/item-summary";
import { listCategories } from "@/features/items/queries";
import { ITEM_LABELS, ITEM_PATHS, type ItemKind } from "@/features/items/types";
import { requireSession } from "@/lib/auth/session";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Ficha de un producto o materia prima. Lee la sesión y los parámetros de la ruta (datos del
 * request): va siempre dentro de un `<Suspense>`. Un id de otro tipo o de otra fábrica es un 404.
 */
export async function ItemDetail({ kind, id }: { kind: ItemKind; id: string }) {
  const session = await requireSession();
  const orgId = session.activeOrganizationId;
  const detail = await getItem(orgId, id);
  if (!detail || detail.item.type !== kind) notFound();

  const { item } = detail;
  const isProduct = kind === "finished_good";
  const [movements, categories, suppliers, usedIn, purchases, orders] = await Promise.all([
    listItemMovements(orgId, id, 50),
    listCategories(orgId, kind),
    isProduct ? Promise.resolve([]) : listSuppliers(orgId),
    isProduct ? Promise.resolve([]) : listUsedIn(orgId, id),
    isProduct ? Promise.resolve([]) : listRecentPurchases(orgId, id, 5),
    isProduct ? listProductOrders(orgId, id, 10) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        title={item.name}
        breadcrumbs={[
          {
            label: ITEM_LABELS[kind].plural[0]!.toUpperCase() + ITEM_LABELS[kind].plural.slice(1),
            href: ITEM_PATHS[kind],
          },
          { label: item.name },
        ]}
        description={
          <>
            <span className="font-mono">{item.sku}</span>
            {item.category ? ` · ${item.category.name}` : ""}
            {item.description ? ` · ${item.description}` : ""}
          </>
        }
        actions={<ItemActions item={item} categories={categories} suppliers={suppliers} />}
      />
      <div className="space-y-8">
        <ItemSummary detail={detail} />
        {isProduct ? (
          <Section title="Órdenes de producción">
            <ProductOrders rows={orders} unitCode={item.unitCode} />
          </Section>
        ) : (
          <>
            <Section title="Usado en">
              <UsedIn rows={usedIn} unitCode={item.unitCode} />
            </Section>
            <Section title="Compras recientes">
              <PurchaseHistory rows={purchases} unitCode={item.unitCode} />
            </Section>
          </>
        )}
        <Section title="Movimientos">
          <ItemMovements rows={movements} />
        </Section>
      </div>
    </>
  );
}

export function ItemDetailSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <Skeleton className="h-16 w-80" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}
