import "server-only";

import { z } from "zod";

import { clampPage, type TableParams } from "@/components/data-table/params";
import { sanitizeSearch } from "@/features/items/search";
import type { ItemCategory, ItemKind, ItemRow } from "@/features/items/types";
import type { UnitCode } from "@/features/products/schemas";
import type { StockLevel } from "@/lib/domain/stock";
import { isOutOfRange } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";

/** Opciones de la tabla compartidas por Productos y Materias primas (las claves viajan por la URL). */
export const ITEM_TABLE_OPTIONS = {
  sortable: ["name", "sku", "stock", "cost", "price"],
  filterable: ["categoria", "stock", "estado"],
  defaultSort: { id: "name", desc: false },
};

const SORT_COLUMNS: Record<string, string> = {
  name: "name",
  sku: "sku",
  stock: "current_stock",
  cost: "cost",
  price: "sale_price",
};

const LEVELS = new Set<StockLevel>(["out", "low", "ok"]);
const STATE_CONDITIONS: Record<string, string> = {
  active: "and(status.eq.active,archived_at.is.null)",
  inactive: "and(status.eq.inactive,archived_at.is.null)",
  archived: "archived_at.not.is.null",
};
const uuid = z.uuid();

export type CatalogRow = {
  id: string;
  type: ItemKind;
  sku: string;
  name: string;
  description: string | null;
  category_id: string | null;
  category_name: string | null;
  unit_code: string;
  min_stock: number;
  current_stock: number;
  avg_cost: number;
  sale_price: number | null;
  standard_labor_minutes: number;
  overhead_per_unit: number;
  preferred_supplier_id: string | null;
  last_purchase_cost: number | null;
  committed: number;
  available: number;
  has_movements: boolean;
  standard_cost: number | null;
  cost: number | null;
  status: "active" | "inactive";
  archived_at: string | null;
  level: StockLevel;
};

export function toItemRow(r: CatalogRow): ItemRow {
  return {
    id: r.id,
    type: r.type,
    sku: r.sku,
    name: r.name,
    description: r.description ?? "",
    category:
      r.category_id && r.category_name ? { id: r.category_id, name: r.category_name } : null,
    unitCode: r.unit_code as UnitCode,
    currentStock: Number(r.current_stock),
    minStock: Number(r.min_stock),
    avgCost: Number(r.avg_cost),
    standardCost: r.standard_cost === null ? null : Number(r.standard_cost),
    cost: r.cost === null ? null : Number(r.cost),
    salePrice: r.sale_price === null ? null : Number(r.sale_price),
    standardLaborMinutes: Number(r.standard_labor_minutes),
    overheadPerUnit: Number(r.overhead_per_unit),
    preferredSupplierId: r.preferred_supplier_id,
    lastPurchaseCost: r.last_purchase_cost === null ? null : Number(r.last_purchase_cost),
    committed: Number(r.committed),
    available: Number(r.available),
    hasMovements: r.has_movements,
    status: r.status,
    archived: r.archived_at !== null,
    level: r.level,
  };
}

/**
 * Ítems de un tipo con búsqueda, filtros, orden y paginación resueltos en la consulta. Los
 * archivados no se muestran salvo que se filtre por "archivado". Se filtra siempre por la fábrica
 * activa: RLS deja ver todas las fábricas del usuario (y la demo pública), no sólo la activa.
 */
export async function listItems(
  orgId: string,
  kind: ItemKind,
  params: TableParams,
): Promise<{ rows: ItemRow[]; total: number }> {
  const supabase = await createClient();

  async function fetchPage(page: number) {
    let query = supabase
      .from("item_catalog")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId)
      .eq("type", kind);

    const q = sanitizeSearch(params.q);
    if (q) query = query.or(`sku.ilike.%${q}%,name.ilike.%${q}%`);

    const categories = (params.filters.categoria ?? []).filter((v) => uuid.safeParse(v).success);
    if (categories.length) query = query.in("category_id", categories);

    const levels = (params.filters.stock ?? []).filter((v): v is StockLevel =>
      LEVELS.has(v as StockLevel),
    );
    if (levels.length) query = query.in("level", levels);

    const states = (params.filters.estado ?? []).filter((v) => v in STATE_CONDITIONS);
    if (states.length) query = query.or(states.map((s) => STATE_CONDITIONS[s]).join(","));
    else query = query.is("archived_at", null);

    const column = SORT_COLUMNS[params.sort?.id ?? ""] ?? "name";
    query = query
      .order(column, { ascending: !(params.sort?.desc ?? false), nullsFirst: false })
      .order("id")
      .range((page - 1) * params.pageSize, page * params.pageSize - 1);

    const { data, count, error } = await query;
    if (isOutOfRange(error)) return { rows: [] as CatalogRow[], total: 0, outOfRange: true };
    if (error) throw error;
    return {
      rows: (data ?? []) as unknown as CatalogRow[],
      total: count ?? 0,
      outOfRange: false,
    };
  }

  // Una página más allá del final (`?page=999`, o tras archivar el último ítem de la última página)
  // termina en la última página, igual que el paginador.
  let fetched = params.page;
  let result = await fetchPage(fetched);
  if (result.outOfRange) {
    fetched = 1;
    result = await fetchPage(fetched);
  }
  const target = clampPage(params.page, result.total, params.pageSize);
  if (result.total > 0 && target !== fetched) result = await fetchPage(target);
  return { rows: result.rows.map(toItemRow), total: result.total };
}

/** Categorías que se pueden usar con este tipo de ítem. */
export async function listCategories(orgId: string, kind: ItemKind): Promise<ItemCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("organization_id", orgId)
    .in("applies_to", [kind, "both"])
    .order("name");
  if (error) throw error;
  return (data ?? []).map((c) => ({ id: c.id, name: c.name }));
}
