import { clampPage, parseTableParams } from "@/components/data-table/params";
import { Skeleton } from "@/components/ui/skeleton";
import { listSuppliers } from "@/features/items/detail-queries";
import { ITEM_TABLE_OPTIONS, listCategories, listItems } from "@/features/items/queries";
import type { ItemKind } from "@/features/items/types";
import { ProductsTable } from "@/features/products/components/products-table";
import { requireSession } from "@/lib/auth/session";

/**
 * Lista de ítems de la fábrica activa. Lee la sesión y los `searchParams` (datos del request): va
 * siempre dentro de un `<Suspense>`.
 */
export async function ItemsList({
  kind,
  searchParams,
}: {
  kind: ItemKind;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const params = parseTableParams(sp, ITEM_TABLE_OPTIONS);
  const [{ rows, total }, categories, suppliers] = await Promise.all([
    listItems(session.activeOrganizationId, kind, params),
    listCategories(session.activeOrganizationId, kind),
    kind === "raw_material" ? listSuppliers(session.activeOrganizationId) : Promise.resolve([]),
  ]);

  return (
    <ProductsTable
      kind={kind}
      rows={rows}
      total={total}
      params={{ ...params, page: clampPage(params.page, total, params.pageSize) }}
      categories={categories}
      suppliers={suppliers}
      openNew={sp.nuevo === "1"}
    />
  );
}

export function ItemsListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-[440px] w-full rounded-lg" />
    </div>
  );
}
