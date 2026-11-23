import "server-only";

import { z } from "zod";

import { clampPage, type TableParams } from "@/components/data-table/params";
import { sanitizeSearch } from "@/features/items/search";
import type {
  OrderDetailData,
  OrderFull,
  OrderPriority,
  OrderRow,
  ProductionStatus,
} from "@/features/production/types";
import { PRIORITY_LABELS } from "@/features/production/types";
import { isOutOfRange } from "@/lib/db-errors";
import { PRODUCTION_STATUS } from "@/lib/domain/status";
import { createClient } from "@/lib/supabase/server";

/** Opciones de la tabla de órdenes (las claves viajan por la URL). */
export const ORDER_TABLE_OPTIONS = {
  sortable: ["code", "plannedEndDate", "progress"],
  filterable: ["estado", "prioridad", "demorada"],
  defaultSort: { id: "plannedEndDate", desc: false },
};

const SORT_COLUMNS: Record<string, string> = {
  code: "code",
  plannedEndDate: "planned_end_date",
  progress: "progress_pct",
};

type OverviewRow = {
  id: string;
  code: string;
  status: ProductionStatus;
  priority: OrderPriority;
  item_id: string;
  item_name: string;
  item_sku: string;
  unit_code: string;
  planned_qty: number;
  good_qty: number;
  defective_qty: number;
  progress_pct: number | null;
  is_delayed: boolean | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  notes: string | null;
  planned_material_cost: number;
  planned_labor_cost: number;
  planned_overhead_cost: number;
  actual_material_cost: number | null;
  actual_labor_cost: number | null;
  actual_overhead_cost: number | null;
  actual_unit_cost: number | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
};

const num = (v: number | null) => (v === null ? null : Number(v));

function toOrderRow(r: OverviewRow): OrderRow {
  return {
    id: r.id,
    code: r.code,
    status: r.status,
    priority: r.priority,
    itemId: r.item_id,
    itemName: r.item_name,
    itemSku: r.item_sku,
    unitCode: r.unit_code,
    plannedQty: Number(r.planned_qty),
    goodQty: Number(r.good_qty),
    defectiveQty: Number(r.defective_qty),
    progressPct: Number(r.progress_pct ?? 0),
    isDelayed: Boolean(r.is_delayed),
    plannedStartDate: r.planned_start_date,
    plannedEndDate: r.planned_end_date,
  };
}

function toOrderFull(r: OverviewRow): OrderFull {
  return {
    ...toOrderRow(r),
    notes: r.notes,
    plannedMaterialCost: Number(r.planned_material_cost),
    plannedLaborCost: Number(r.planned_labor_cost),
    plannedOverheadCost: Number(r.planned_overhead_cost),
    actualMaterialCost: num(r.actual_material_cost),
    actualLaborCost: num(r.actual_labor_cost),
    actualOverheadCost: num(r.actual_overhead_cost),
    actualUnitCost: num(r.actual_unit_cost),
    startedAt: r.started_at,
    completedAt: r.completed_at,
    cancelledAt: r.cancelled_at,
    cancelReason: r.cancel_reason,
  };
}

/**
 * Órdenes de producción de la fábrica activa, con búsqueda, filtros, orden y paginación en la
 * consulta. Una página fuera de rango termina en la última, igual que el paginador.
 */
export async function listOrders(
  orgId: string,
  params: TableParams,
): Promise<{ rows: OrderRow[]; total: number }> {
  const supabase = await createClient();
  const statuses = (params.filters.estado ?? []).filter((v) => v in PRODUCTION_STATUS);
  const priorities = (params.filters.prioridad ?? []).filter((v) => v in PRIORITY_LABELS);
  const onlyDelayed = params.filters.demorada?.[0] === "1";
  const q = sanitizeSearch(params.q);
  const column = SORT_COLUMNS[params.sort?.id ?? ""] ?? "planned_end_date";
  const ascending = !(params.sort?.desc ?? false);

  async function fetchPage(page: number) {
    let query = supabase
      .from("production_order_overview")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId);
    if (q) query = query.or(`code.ilike.%${q}%,item_name.ilike.%${q}%`);
    if (statuses.length) query = query.in("status", statuses);
    if (priorities.length) query = query.in("priority", priorities);
    if (onlyDelayed) query = query.eq("is_delayed", true);
    const result = await query
      .order(column, { ascending, nullsFirst: false })
      .order("id", { ascending })
      .range((page - 1) * params.pageSize, page * params.pageSize - 1);
    if (isOutOfRange(result.error))
      return { rows: [] as OverviewRow[], total: 0, outOfRange: true };
    if (result.error) throw result.error;
    return {
      rows: (result.data ?? []) as unknown as OverviewRow[],
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
  return { rows: result.rows.map(toOrderRow), total: result.total };
}

/** Una orden de la fábrica activa con materiales, personal, partes y eventos, o `null` si no existe. */
export async function getOrder(orgId: string, id: string): Promise<OrderDetailData | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_order_overview")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [materials, team, reports, events] = await Promise.all([
    supabase
      .from("production_material_details")
      .select("*")
      .eq("organization_id", orgId)
      .eq("production_order_id", id)
      .order("item_name"),
    supabase
      .from("production_team")
      .select("*")
      .eq("organization_id", orgId)
      .eq("production_order_id", id)
      .order("first_name"),
    supabase
      .from("production_report_details")
      .select("*")
      .eq("organization_id", orgId)
      .eq("production_order_id", id)
      .order("report_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("production_event_details")
      .select("*")
      .eq("organization_id", orgId)
      .eq("production_order_id", id)
      .order("occurred_at", { ascending: true })
      .order("id", { ascending: true }),
  ]);
  for (const r of [materials, team, reports, events]) if (r.error) throw r.error;

  return {
    order: toOrderFull(data as unknown as OverviewRow),
    materials: (materials.data ?? []).map((m) => ({
      id: m.id as string,
      itemId: m.item_id as string,
      itemName: m.item_name as string,
      sku: m.item_sku as string,
      unitCode: m.unit_code as string,
      plannedQty: Number(m.planned_qty),
      consumedQty: Number(m.consumed_qty),
      returnedQty: Number(m.returned_qty),
      scrapQty: Number(m.scrap_qty),
      wastePct: Number(m.waste_pct),
      costConsumed: Number(m.cost_consumed),
      available: Number(m.available),
    })),
    team: (team.data ?? []).map((t) => ({
      id: t.id as string,
      employeeId: t.employee_id as string,
      name: `${t.first_name} ${t.last_name}`,
      position: (t.position as string | null) ?? null,
      role: t.role_in_order as string,
      hoursWorked: Number(t.hours_worked),
    })),
    reports: (reports.data ?? []).map((r) => ({
      id: r.id as string,
      reportDate: r.report_date as string,
      goodQty: Number(r.good_qty),
      defectiveQty: Number(r.defective_qty),
      notes: (r.notes as string | null) ?? null,
      employeeName: (r.employee_name as string | null) ?? null,
      createdAt: r.created_at as string,
    })),
    events: (events.data ?? []).map((e) => ({
      id: e.id as string,
      fromStatus: (e.from_status as string | null) ?? null,
      toStatus: e.to_status as string,
      note: (e.note as string | null) ?? null,
      occurredAt: e.occurred_at as string,
    })),
  };
}

export type EmployeeOption = { id: string; name: string; position: string | null };

/** Empleados activos de la fábrica, para elegir al responsable de una orden. */
export async function listEmployees(orgId: string): Promise<EmployeeOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id, first_name, last_name, position")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .order("last_name")
    .order("first_name");
  if (error) throw error;
  return (data ?? []).map((e) => ({
    id: e.id as string,
    name: `${e.first_name} ${e.last_name}`,
    position: (e.position as string | null) ?? null,
  }));
}

export type ProducibleItem = { id: string; name: string; sku: string; unitCode: string };

/** Productos activos de la fábrica (los que se pueden planificar). */
export async function listProducibleItems(orgId: string): Promise<ProducibleItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("item_catalog")
    .select("id, name, sku, unit_code")
    .eq("organization_id", orgId)
    .eq("type", "finished_good")
    .eq("status", "active")
    .is("archived_at", null)
    .order("name");
  if (error) throw error;
  return (data ?? []).map((i) => ({
    id: i.id as string,
    name: i.name as string,
    sku: i.sku as string,
    unitCode: i.unit_code as string,
  }));
}
