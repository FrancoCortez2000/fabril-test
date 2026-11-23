import { clampPage, parseTableParams } from "@/components/data-table/params";
import { Skeleton } from "@/components/ui/skeleton";
import { PurchasesTable } from "@/features/purchasing/components/purchases-table";
import { listPurchases, PURCHASE_TABLE_OPTIONS } from "@/features/purchasing/queries";
import { requireSession } from "@/lib/auth/session";

/**
 * Compras de la fábrica activa. Lee la sesión y los `searchParams` (datos del request): va siempre
 * dentro de un `<Suspense>`.
 */
export async function PurchasesList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const params = parseTableParams(await searchParams, PURCHASE_TABLE_OPTIONS);
  const { rows, total } = await listPurchases(session.activeOrganizationId, params);

  return (
    <PurchasesTable
      rows={rows}
      total={total}
      params={{ ...params, page: clampPage(params.page, total, params.pageSize) }}
    />
  );
}

export function PurchasesListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-[420px] w-full rounded-lg" />
    </div>
  );
}
