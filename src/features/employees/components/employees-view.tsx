import { clampPage, parseTableParams } from "@/components/data-table/params";
import { Skeleton } from "@/components/ui/skeleton";
import { EmployeesTable } from "@/features/employees/components/employees-table";
import {
  EMPLOYEE_TABLE_OPTIONS,
  listAreas,
  listEmployeesTable,
} from "@/features/employees/queries";
import { requireSession } from "@/lib/auth/session";

/**
 * Empleados de la fábrica activa. Lee la sesión y los `searchParams` (datos del request): va siempre
 * dentro de un `<Suspense>`.
 */
export async function EmployeesView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const orgId = session.activeOrganizationId;
  const params = parseTableParams(await searchParams, EMPLOYEE_TABLE_OPTIONS);
  const [{ rows, total }, areas] = await Promise.all([
    listEmployeesTable(orgId, params, { showCost: session.mode !== "demo" }),
    listAreas(orgId),
  ]);

  return (
    <EmployeesTable
      rows={rows}
      total={total}
      params={{ ...params, page: clampPage(params.page, total, params.pageSize) }}
      areas={areas}
    />
  );
}

export function EmployeesViewSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-[420px] w-full rounded-lg" />
    </div>
  );
}
