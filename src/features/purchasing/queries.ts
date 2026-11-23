import "server-only";

import { z } from "zod";

import { clampPage, type TableParams } from "@/components/data-table/params";
import { sanitizeSearch } from "@/features/items/search";
import type { PurchaseLineDetail, PurchaseRow, PurchaseStatus } from "@/features/purchasing/types";
import { isOutOfRange } from "@/lib/db-errors";
import { PURCHASE_STATUS } from "@/lib/domain/status";
import { createClient } from "@/lib/supabase/server";

/** Opciones de la tabla de compras (las claves viajan por la URL). */
export const PURCHASE_TABLE_OPTIONS = {
  sortable: ["code", "orderDate", "expectedDate", "total"],
  filterable: ["estado"],
  defaultSort: { id: "orderDate", desc: true },
};

const SORT_COLUMNS: Record<string, string> = {
  code: "code",
  orderDate: "order_date",
  expectedDate: "expected_date",
  total: "total",
};

type OverviewRow = {
  id: string;
  code: string;
  status: PurchaseStatus;
  order_date: string;
  expected_date: string | null;
  notes: string | null;
  subtotal: number;
  tax_total: number;
  total: number;
  cancel_reason: string | null;
  supplier_id: string;
  supplier_name: string;
  line_count: number;
  received_pct: number;
  is_late: boolean | null;
};

function toPurchaseRow(r: OverviewRow): PurchaseRow {
  return {
    id: r.id,
    code: r.code,
    status: r.status,
    orderDate: r.order_date,
    expectedDate: r.expected_date,
    notes: r.notes,
    subtotal: Number(r.subtotal),
    taxTotal: Number(r.tax_total),
    total: Number(r.total),
    cancelReason: r.cancel_reason,
    supplierId: r.supplier_id,
    supplierName: r.supplier_name,
    lineCount: Number(r.line_count),
    receivedPct: Number(r.received_pct),
    isLate: Boolean(r.is_late),
  };
}

/**
 * Compras de la fábrica activa, con búsqueda, filtro por estado, orden y paginación en la consulta.
 * Una página fuera de rango termina en la última, igual que el paginador.
 */
export async function listPurchases(
  orgId: string,
  params: TableParams,
): Promise<{ rows: PurchaseRow[]; total: number }> {
  const supabase = await createClient();
  const statuses = (params.filters.estado ?? []).filter((v) => v in PURCHASE_STATUS);
  const q = sanitizeSearch(params.q);
  const column = SORT_COLUMNS[params.sort?.id ?? ""] ?? "order_date";
  const ascending = !(params.sort?.desc ?? false);

  async function fetchPage(page: number) {
    let query = supabase
      .from("purchase_overview")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId);
    if (q) query = query.or(`code.ilike.%${q}%,supplier_name.ilike.%${q}%`);
    if (statuses.length) query = query.in("status", statuses);
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
  return { rows: result.rows.map(toPurchaseRow), total: result.total };
}

/** Una compra de la fábrica activa con sus líneas, o `null` si no existe. */
export async function getPurchase(
  orgId: string,
  id: string,
): Promise<{ purchase: PurchaseRow; lines: PurchaseLineDetail[] } | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchase_overview")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: lines, error: linesError } = await supabase
    .from("purchase_line_details")
    .select("*")
    .eq("organization_id", orgId)
    .eq("purchase_order_id", id)
    .order("item_name");
  if (linesError) throw linesError;

  return {
    purchase: toPurchaseRow(data as unknown as OverviewRow),
    lines: (lines ?? []).map((l) => ({
      id: l.id as string,
      itemId: l.item_id as string,
      itemName: l.item_name as string,
      sku: l.item_sku as string,
      unitCode: l.unit_code as string,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unit_price),
      taxRate: Number(l.tax_rate),
      receivedQty: Number(l.received_qty),
      pendingQty: Number(l.pending_qty),
      lineTotal: Number(l.line_total),
    })),
  };
}
