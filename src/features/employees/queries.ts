import "server-only";

import { clampPage, type TableParams } from "@/components/data-table/params";
import type { AreaOption, EmployeeRow, EmployeeStatus } from "@/features/employees/types";
import { EMPLOYEE_STATUS_LABELS } from "@/features/employees/types";
import { sanitizeSearch } from "@/features/items/search";
import { isOutOfRange } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";

/** Opciones de la tabla de empleados (las claves viajan por la URL). */
export const EMPLOYEE_TABLE_OPTIONS = {
  sortable: ["name"],
  filterable: ["estado"],
  defaultSort: { id: "name", desc: false },
};

type EmployeeDbRow = {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  area_id: string | null;
  status: EmployeeStatus;
  hourly_cost?: number | string | null;
};

/** Áreas de la fábrica, por nombre. */
export async function listAreas(orgId: string): Promise<AreaOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("areas")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name");
  if (error) throw error;
  return (data ?? []).map((a) => ({ id: a.id as string, name: a.name as string }));
}

/**
 * Empleados de la fábrica activa (sin `showCost` no se pide el costo por hora: la demo pública no
 * puede leerlo), con búsqueda por nombre o cargo, filtro por estado y paginación en
 * la consulta. Una página fuera de rango termina en la última, igual que el paginador.
 */
export async function listEmployeesTable(
  orgId: string,
  params: TableParams,
  { showCost = true }: { showCost?: boolean } = {},
): Promise<{ rows: EmployeeRow[]; total: number }> {
  const supabase = await createClient();
  const statuses = (params.filters.estado ?? []).filter((v) => v in EMPLOYEE_STATUS_LABELS);
  const q = sanitizeSearch(params.q);
  const ascending = !(params.sort?.desc ?? false);

  async function fetchPage(page: number) {
    let query = supabase
      .from("employees")
      .select(
        showCost
          ? "id, first_name, last_name, position, area_id, status, hourly_cost"
          : "id, first_name, last_name, position, area_id, status",
        { count: "exact" },
      )
      .eq("organization_id", orgId);
    if (q) {
      query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,position.ilike.%${q}%`);
    }
    if (statuses.length) query = query.in("status", statuses);
    const result = await query
      .order("last_name", { ascending })
      .order("first_name", { ascending })
      .order("id", { ascending })
      .range((page - 1) * params.pageSize, page * params.pageSize - 1);
    if (isOutOfRange(result.error))
      return { rows: [] as EmployeeDbRow[], total: 0, outOfRange: true };
    if (result.error) throw result.error;
    return {
      rows: (result.data ?? []) as unknown as EmployeeDbRow[],
      total: result.count ?? 0,
      outOfRange: false,
    };
  }

  let fetched = params.page;
  let result = await fetchPage(fetched);
  if (result.outOfRange) {
    fetched = 1;
    result = await fetchPage(fetched);
  }
  const target = clampPage(params.page, result.total, params.pageSize);
  if (result.total > 0 && target !== fetched) result = await fetchPage(target);

  const areas = new Map((await listAreas(orgId)).map((a) => [a.id, a.name]));
  const rows = result.rows.map((e): EmployeeRow => ({
    id: e.id,
    firstName: e.first_name,
    lastName: e.last_name,
    name: `${e.first_name} ${e.last_name}`,
    position: e.position,
    areaId: e.area_id,
    areaName: e.area_id ? (areas.get(e.area_id) ?? null) : null,
    status: e.status,
    hourlyCost:
      e.hourly_cost === null || e.hourly_cost === undefined ? null : Number(e.hourly_cost),
  }));
  return { rows, total: result.total };
}
