import { clampPage, parseTableParams } from "@/components/data-table/params";
import { Skeleton } from "@/components/ui/skeleton";
import { StockTable } from "@/features/inventory/components/stock-table";
import { listAllCategories, listStock, STOCK_TABLE_OPTIONS } from "@/features/inventory/queries";
import { requireSession } from "@/lib/auth/session";

/**
 * Existencias de la fábrica activa. Lee la sesión y los `searchParams` (datos del request): va
 * siempre dentro de un `<Suspense>`.
 */
export async function StockList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const params = parseTableParams(await searchParams, STOCK_TABLE_OPTIONS);
  const orgId = session.activeOrganizationId;
  const [{ rows, total, totals }, categories] = await Promise.all([
    listStock(orgId, params),
    listAllCategories(orgId),
  ]);

  return (
    <StockTable
      rows={rows}
      total={total}
      params={{ ...params, page: clampPage(params.page, total, params.pageSize) }}
      categories={categories}
      totals={totals}
    />
  );
}

export function StockListSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-[420px] w-full rounded-lg" />
    </div>
  );
}
