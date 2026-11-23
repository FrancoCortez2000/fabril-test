import { clampPage, parseTableParams } from "@/components/data-table/params";
import { Skeleton } from "@/components/ui/skeleton";
import { OrdersTable } from "@/features/production/components/orders-table";
import { listOrders, ORDER_TABLE_OPTIONS } from "@/features/production/queries";
import { requireSession } from "@/lib/auth/session";

/**
 * Órdenes de producción de la fábrica activa. Lee la sesión y los `searchParams` (datos del
 * request): va siempre dentro de un `<Suspense>`.
 */
export async function OrdersList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const params = parseTableParams(await searchParams, ORDER_TABLE_OPTIONS);
  const { rows, total } = await listOrders(session.activeOrganizationId, params);

  return (
    <OrdersTable
      rows={rows}
      total={total}
      params={{ ...params, page: clampPage(params.page, total, params.pageSize) }}
    />
  );
}

export function OrdersListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-[420px] w-full rounded-lg" />
    </div>
  );
}
