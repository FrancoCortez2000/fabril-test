import "server-only";

import { z } from "zod";

import { clampPage, type TableParams } from "@/components/data-table/params";
import { toMovementRow, type FeedRow } from "@/features/inventory/movement-row";
import { MOVEMENT_TYPE_LABELS, type MovementRow } from "@/features/inventory/types";
import { sanitizeSearch } from "@/features/items/search";
import type { ItemCategory, ItemKind } from "@/features/items/types";
import type { StockLevel } from "@/lib/domain/stock";
import { createClient } from "@/lib/supabase/server";

/** Opciones de la tabla de existencias (las claves viajan por la URL). */
export const STOCK_TABLE_OPTIONS = {
  sortable: ["name", "sku", "physical", "available", "value"],
  filterable: ["tipo", "categoria", "nivel"],
  defaultSort: { id: "name", desc: false },
};

const SORT_COLUMNS: Record<string, string> = {
  name: "name",
  sku: "sku",
  physical: "current_stock",
  available: "available",
  value: "stock_value",
};

const TYPES = new Set<ItemKind>(["finished_good", "raw_material"]);
const LEVELS = new Set<StockLevel>(["out", "low", "ok"]);
const uuid = z.uuid();

export type StockRow = {
  itemId: string;
  type: ItemKind;
  sku: string;
  name: string;
  categoryName: string | null;
  unitCode: string;
  minStock: number;
  /** Stock físico. */
  physical: number;
  /** Comprometido en órdenes planificadas. */
  committed: number;
  available: number;
  avgCost: number;
  /** Stock × costo promedio. */
  value: number;
  level: StockLevel;
};

export type StockTotals = { value: number; out: number; low: number };

type CatalogRow = {
  id: string;
  type: ItemKind;
  sku: string;
  name: string;
  category_name: string | null;
  unit_code: string;
  min_stock: number;
  current_stock: number;
  committed: number;
  available: number;
  avg_cost: number;
  stock_value: number | null;
  level: StockLevel;
};

function toStockRow(r: CatalogRow): StockRow {
  return {
    itemId: r.id,
    type: r.type,
    sku: r.sku,
    name: r.name,
    categoryName: r.category_name,
    unitCode: r.unit_code,
    minStock: Number(r.min_stock),
    physical: Number(r.current_stock),
    committed: Number(r.committed),
    available: Number(r.available),
    avgCost: Number(r.avg_cost),
    value: Number(r.stock_value ?? 0),
    level: r.level,
  };
}

/**
 * Existencias de la fábrica activa, con búsqueda, filtros, orden y paginación en la consulta. Los
 * totales cubren todo el conjunto filtrado (no sólo la página). Se filtra siempre por la fábrica
 * activa: RLS deja ver todas las fábricas del usuario (y la demo pública).
 */
export async function listStock(
  orgId: string,
  params: TableParams,
): Promise<{ rows: StockRow[]; total: number; totals: StockTotals }> {
  const supabase = await createClient();

  const types = (params.filters.tipo ?? []).filter((v): v is ItemKind => TYPES.has(v as ItemKind));
  const categories = (params.filters.categoria ?? []).filter((v) => uuid.safeParse(v).success);
  const levels = (params.filters.nivel ?? []).filter((v): v is StockLevel =>
    LEVELS.has(v as StockLevel),
  );
  const q = sanitizeSearch(params.q);

  function base<T extends string>(select: T, count?: "exact") {
    let query = supabase
      .from("item_catalog")
      .select(select, count ? { count } : undefined)
      .eq("organization_id", orgId)
      .is("archived_at", null);
    if (q) query = query.or(`sku.ilike.%${q}%,name.ilike.%${q}%`);
    if (types.length) query = query.in("type", types);
    if (categories.length) query = query.in("category_id", categories);
    if (levels.length) query = query.in("level", levels);
    return query;
  }

  const column = SORT_COLUMNS[params.sort?.id ?? ""] ?? "name";
  const page = await base("*", "exact")
    .order(column, { ascending: !(params.sort?.desc ?? false), nullsFirst: false })
    .order("id")
    .range((params.page - 1) * params.pageSize, params.page * params.pageSize - 1);
  if (page.error) throw page.error;

  const all = await base("level, stock_value");
  if (all.error) throw all.error;

  const totals = (
    (all.data ?? []) as unknown as { level: StockLevel; stock_value: number | null }[]
  ).reduce<StockTotals>(
    (acc, r) => ({
      value: acc.value + Number(r.stock_value ?? 0),
      out: acc.out + (r.level === "out" ? 1 : 0),
      low: acc.low + (r.level === "low" ? 1 : 0),
    }),
    { value: 0, out: 0, low: 0 },
  );

  return {
    rows: ((page.data ?? []) as unknown as CatalogRow[]).map(toStockRow),
    total: page.count ?? 0,
    totals: { ...totals, value: Math.round(totals.value * 100) / 100 },
  };
}

/** Todas las categorías de la fábrica, para el filtro de existencias. */
export async function listAllCategories(orgId: string): Promise<ItemCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name");
  if (error) throw error;
  return (data ?? []).map((c) => ({ id: c.id, name: c.name }));
}

/** Opciones de la tabla de movimientos (las claves viajan por la URL). */
export const MOVEMENT_TABLE_OPTIONS = {
  sortable: ["occurredAt", "quantity"],
  filterable: ["tipo", "item", "desde", "hasta"],
  defaultSort: { id: "occurredAt", desc: true },
};

const MOVEMENT_SORT: Record<string, string> = { occurredAt: "occurred_at", quantity: "quantity" };
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function validDate(value: string | undefined): string | null {
  if (!value || !DATE_ONLY.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : value;
}

/** Fechas `desde` y `hasta` (YYYY-MM-DD) de la URL: las inválidas se ignoran, y si están al revés, ambas. */
export function dateRange(filters: Record<string, string[]>): {
  from: string | null;
  to: string | null;
} {
  const from = validDate(filters.desde?.[0]);
  const to = validDate(filters.hasta?.[0]);
  return from && to && from > to ? { from: null, to: null } : { from, to };
}

/**
 * Historial de movimientos de la fábrica activa, con búsqueda, filtros, orden y paginación en la
 * consulta. Las fechas se interpretan en hora argentina (UTC-3).
 */
export async function listMovements(
  orgId: string,
  params: TableParams,
): Promise<{ rows: MovementRow[]; total: number }> {
  const supabase = await createClient();
  const types = (params.filters.tipo ?? []).filter((v) => v in MOVEMENT_TYPE_LABELS);
  const items = (params.filters.item ?? []).filter((v) => uuid.safeParse(v).success);
  const { from, to } = dateRange(params.filters);
  const q = sanitizeSearch(params.q);
  const column = MOVEMENT_SORT[params.sort?.id ?? ""] ?? "occurred_at";

  async function fetchPage(page: number) {
    let query = supabase
      .from("movement_feed")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId);
    if (q) {
      query = query.or(
        ["item_name", "item_sku", "reason", "reference"].map((c) => `${c}.ilike.%${q}%`).join(","),
      );
    }
    if (types.length) query = query.in("movement_type", types);
    if (items.length) query = query.in("item_id", items);
    if (from) query = query.gte("occurred_at", `${from}T00:00:00-03:00`);
    if (to) query = query.lte("occurred_at", `${to}T23:59:59.999-03:00`);
    const result = await query
      .order(column, { ascending: !(params.sort?.desc ?? false), nullsFirst: false })
      .order("id", { ascending: !(params.sort?.desc ?? false) })
      .range((page - 1) * params.pageSize, page * params.pageSize - 1);
    if (result.error) throw result.error;
    return { rows: (result.data ?? []) as unknown as FeedRow[], total: result.count ?? 0 };
  }

  let result = await fetchPage(params.page);
  if (result.rows.length === 0 && result.total > 0) {
    result = await fetchPage(clampPage(params.page, result.total, params.pageSize));
  }
  return { rows: result.rows.map(toMovementRow), total: result.total };
}

/** Ítems de la fábrica para el filtro de movimientos. */
export async function listItemOptions(
  orgId: string,
): Promise<{ id: string; name: string; sku: string; type: ItemKind }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("item_catalog")
    .select("id, name, sku, type")
    .eq("organization_id", orgId)
    .order("name");
  if (error) throw error;
  return (data ?? []).map((i) => ({
    id: i.id as string,
    name: i.name as string,
    sku: i.sku as string,
    type: i.type as ItemKind,
  }));
}
