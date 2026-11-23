import "server-only";

import { z } from "zod";

import type { TableParams } from "@/components/data-table/params";
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
