import { clampPage, parseTableParams } from "@/components/data-table/params";
import { Skeleton } from "@/components/ui/skeleton";
import { MovementsTable } from "@/features/inventory/components/movements-table";
import {
  listItemOptions,
  listMovements,
  MOVEMENT_TABLE_OPTIONS,
} from "@/features/inventory/queries";
import { requireSession } from "@/lib/auth/session";

/**
 * Historial de movimientos de la fábrica activa. Lee la sesión y los `searchParams` (datos del
 * request): va siempre dentro de un `<Suspense>`.
 */
export async function MovementsList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const params = parseTableParams(await searchParams, MOVEMENT_TABLE_OPTIONS);
  const orgId = session.activeOrganizationId;
  const [{ rows, total }, items] = await Promise.all([
    listMovements(orgId, params),
    listItemOptions(orgId),
  ]);

  return (
    <MovementsTable
      rows={rows}
      total={total}
      params={{ ...params, page: clampPage(params.page, total, params.pageSize) }}
      items={items}
    />
  );
}

export function MovementsListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-[440px] w-full rounded-lg" />
    </div>
  );
}
