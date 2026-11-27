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
import { getBom, listRawMaterialOptions } from "@/features/items/bom-queries";
import { BomPanel } from "@/features/items/components/bom-panel";
import { ItemActions } from "@/features/items/components/item-actions";
import { ItemMovements } from "@/features/items/components/item-movements";
import { ProductOrders, PurchaseHistory, UsedIn } from "@/features/items/components/item-related";
import { ItemSummary } from "@/features/items/components/item-summary";
import { listCategories } from "@/features/items/queries";
import { ITEM_LABELS, ITEM_PATHS, type ItemKind } from "@/features/items/types";
import { requireSession } from "@/lib/auth/session";

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
  const [movements, categories, suppliers, usedIn, purchases, orders, bom, materials] =
    await Promise.all([
      listItemMovements(orgId, id, 10),
      listCategories(orgId, kind),
      isProduct ? Promise.resolve([]) : listSuppliers(orgId),
      isProduct ? Promise.resolve([]) : listUsedIn(orgId, id),
      isProduct ? Promise.resolve([]) : listRecentPurchases(orgId, id, 5),
      isProduct ? listProductOrders(orgId, id, 10) : Promise.resolve([]),
      isProduct ? getBom(orgId, id) : Promise.resolve(null),
      isProduct ? listRawMaterialOptions(orgId) : Promise.resolve([]),
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
          <>
            <BomPanel itemId={id} productUnit={item.unitCode} bom={bom} materials={materials} />
            <ProductOrders rows={orders} unitCode={item.unitCode} />
          </>
        ) : (
          <>
            <UsedIn rows={usedIn} unitCode={item.unitCode} />
            <PurchaseHistory rows={purchases} unitCode={item.unitCode} />
          </>
        )}
        <ItemMovements rows={movements} />
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
