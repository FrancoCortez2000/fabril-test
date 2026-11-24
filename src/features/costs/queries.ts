import "server-only";

import type { OrderDeviationRow, ProductCostRow } from "@/features/costs/types";
import { marginPct } from "@/features/items/calc";
import { createClient } from "@/lib/supabase/server";

const DEVIATION_ORDERS = 8;

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

/**
 * Datos de la pantalla de Costos: costo estándar y margen de cada producto, y el desvío unitario
 * (planificado vs. real) de las últimas órdenes completadas. Todo acotado a la fábrica.
 */
export async function getCosts(
  orgId: string,
): Promise<{ products: ProductCostRow[]; deviations: OrderDeviationRow[] }> {
  const supabase = await createClient();
  const [catalog, costing, orders] = await Promise.all([
    supabase
      .from("item_catalog")
      .select("id, name, sku, sale_price")
      .eq("organization_id", orgId)
      .eq("type", "finished_good")
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("item_costing")
      .select("item_id, materials_cost, labor_cost, overhead_cost, standard_cost")
      .eq("organization_id", orgId),
    supabase
      .from("production_order_overview")
      .select(
        "id, code, item_name, planned_qty, planned_material_cost, planned_labor_cost, planned_overhead_cost, actual_unit_cost, completed_at",
      )
      .eq("organization_id", orgId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(DEVIATION_ORDERS),
  ]);
  for (const r of [catalog, costing, orders]) if (r.error) throw r.error;

  const costByItem = new Map((costing.data ?? []).map((c) => [c.item_id as string, c]));

  const products = (catalog.data ?? []).map((i): ProductCostRow => {
    const c = costByItem.get(i.id as string);
    const standard = num(c?.standard_cost);
    const price = num(i.sale_price);
    return {
      itemId: i.id as string,
      name: i.name as string,
      sku: i.sku as string,
      materials: num(c?.materials_cost),
      labor: standard === null ? null : num(c?.labor_cost),
      overhead: standard === null ? null : num(c?.overhead_cost),
      standard,
      price,
      margin: marginPct(price, standard),
    };
  });

  const deviations = (orders.data ?? []).flatMap((o): OrderDeviationRow[] => {
    const qty = Number(o.planned_qty);
    const actual = num(o.actual_unit_cost);
    if (actual === null || !(qty > 0)) return [];
    const planned =
      Number(o.planned_material_cost) +
      Number(o.planned_labor_cost) +
      Number(o.planned_overhead_cost);
    return [
      {
        id: o.id as string,
        code: o.code as string,
        itemName: o.item_name as string,
        plannedUnit: round2(planned / qty),
        actualUnit: actual,
      },
    ];
  });

  return { products, deviations };
}
