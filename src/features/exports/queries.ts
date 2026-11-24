import "server-only";

import { getCosts } from "@/features/costs/queries";
import { PRIORITY_LABELS, type OrderPriority } from "@/features/production/types";
import { PRODUCTION_STATUS, type ProductionStatus } from "@/lib/domain/status";
import type { CsvCell } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";

export type ExportData = { columns: string[]; rows: CsvCell[][] };

/** Máximo de filas por exportación (una fábrica chica no llega; evita descargas sin fin). */
const MAX_ROWS = 5000;

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

/** `YYYY-MM-DD` en Buenos Aires de un instante. */
function dayInBuenosAires(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(
    new Date(iso),
  );
}

/** Existencias de la fábrica: un renglón por ítem activo (sin archivados). Sin datos de autor. */
export async function exportInventory(orgId: string): Promise<ExportData> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("item_catalog")
    .select(
      "sku, name, type, category_name, unit_code, current_stock, committed, available, cost, stock_value",
    )
    .eq("organization_id", orgId)
    .is("archived_at", null)
    .order("name")
    .limit(MAX_ROWS);
  if (error) throw error;
  return {
    columns: [
      "SKU",
      "Nombre",
      "Tipo",
      "Categoría",
      "Unidad",
      "Stock",
      "Comprometido",
      "Disponible",
      "Costo",
      "Valor",
    ],
    rows: (data ?? []).map((i) => [
      i.sku as string,
      i.name as string,
      i.type === "finished_good" ? "Producto" : "Materia prima",
      (i.category_name as string | null) ?? null,
      i.unit_code as string,
      num(i.current_stock),
      num(i.committed),
      num(i.available),
      num(i.cost),
      num(i.stock_value),
    ]),
  };
}

/** Órdenes de producción de la fábrica, de la más nueva a la más vieja, con costos. */
export async function exportProduction(orgId: string): Promise<ExportData> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_order_overview")
    .select(
      "code, item_name, item_sku, status, priority, planned_qty, good_qty, defective_qty, progress_pct, planned_start_date, planned_end_date, completed_at, planned_material_cost, planned_labor_cost, planned_overhead_cost, actual_material_cost, actual_labor_cost, actual_overhead_cost, actual_unit_cost",
    )
    .eq("organization_id", orgId)
    .order("code", { ascending: false })
    .limit(MAX_ROWS);
  if (error) throw error;
  return {
    columns: [
      "Orden",
      "Producto",
      "SKU",
      "Estado",
      "Prioridad",
      "Cantidad planificada",
      "Buenas",
      "Defectuosas",
      "Avance %",
      "Inicio previsto",
      "Fin previsto",
      "Completada",
      "Costo planificado",
      "Costo real",
      "Costo unitario real",
    ],
    rows: (data ?? []).map((o) => {
      const planned = round2(
        Number(o.planned_material_cost) +
          Number(o.planned_labor_cost) +
          Number(o.planned_overhead_cost),
      );
      const parts = [o.actual_material_cost, o.actual_labor_cost, o.actual_overhead_cost];
      const actual = parts.some((p) => p === null || p === undefined)
        ? null
        : round2(parts.reduce<number>((s, p) => s + Number(p), 0));
      return [
        o.code as string,
        o.item_name as string,
        o.item_sku as string,
        PRODUCTION_STATUS[o.status as ProductionStatus]?.label ?? (o.status as string),
        PRIORITY_LABELS[o.priority as OrderPriority] ?? (o.priority as string),
        num(o.planned_qty),
        num(o.good_qty),
        num(o.defective_qty),
        num(o.progress_pct),
        (o.planned_start_date as string | null) ?? null,
        (o.planned_end_date as string | null) ?? null,
        dayInBuenosAires(o.completed_at as string | null),
        planned,
        actual,
        num(o.actual_unit_cost),
      ];
    }),
  };
}

/** Costo estándar y margen de cada producto (lo que no se puede calcular queda vacío). */
export async function exportCosts(orgId: string): Promise<ExportData> {
  const { products } = await getCosts(orgId);
  return {
    columns: [
      "Producto",
      "SKU",
      "Materiales",
      "Mano de obra",
      "Indirectos",
      "Costo estándar",
      "Precio",
      "Margen %",
    ],
    rows: products.map((p) => [
      p.name,
      p.sku,
      p.materials,
      p.labor,
      p.overhead,
      p.standard,
      p.price,
      p.margin === null ? null : round2(p.margin),
    ]),
  };
}
