import "server-only";

import { z } from "zod";

import type { BomLineInput } from "@/features/production/logic";
import { createClient } from "@/lib/supabase/server";

const uuid = z.uuid();

export type BomLineView = BomLineInput & {
  /** Costo promedio de la materia prima. */
  avgCost: number;
  /** Stock menos lo comprometido en órdenes planificadas. */
  available: number;
};

export type BomView = {
  outputQty: number;
  /** Desperdicio por defecto de la receta (nulo: usa el de la fábrica). */
  defaultWastePct: number | null;
  orgWastePct: number;
  notes: string | null;
  lines: BomLineView[];
};

export type RawMaterialOption = { id: string; name: string; unitCode: string };

/** Receta de un producto de la fábrica activa, con el costo y la disponibilidad de cada materia prima. */
export async function getBom(orgId: string, itemId: string): Promise<BomView | null> {
  if (!uuid.safeParse(itemId).success) return null;
  const supabase = await createClient();

  const { data: bom, error } = await supabase
    .from("boms")
    .select("id, output_qty, default_waste_pct, notes")
    .eq("item_id", itemId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) throw error;
  if (!bom) return null;

  const [{ data: org, error: orgError }, { data: lines, error: linesError }] = await Promise.all([
    supabase.from("organizations").select("default_waste_pct").eq("id", orgId).maybeSingle(),
    supabase
      .from("bom_lines")
      .select("component_item_id, quantity, waste_pct, position")
      .eq("bom_id", bom.id)
      .eq("organization_id", orgId)
      .order("position"),
  ]);
  if (orgError) throw orgError;
  if (linesError) throw linesError;

  const ids = (lines ?? []).map((l) => l.component_item_id as string);
  const { data: items, error: itemsError } = ids.length
    ? await supabase
        .from("item_catalog")
        .select("id, name, unit_code, avg_cost, available")
        .eq("organization_id", orgId)
        .in("id", ids)
    : { data: [], error: null };
  if (itemsError) throw itemsError;
  const byId = new Map((items ?? []).map((i) => [i.id as string, i]));

  return {
    outputQty: Number(bom.output_qty),
    defaultWastePct: bom.default_waste_pct === null ? null : Number(bom.default_waste_pct),
    orgWastePct: Number(org?.default_waste_pct ?? 0),
    notes: bom.notes ?? null,
    lines: (lines ?? []).flatMap((l) => {
      const item = byId.get(l.component_item_id as string);
      if (!item) return [];
      return [
        {
          itemId: l.component_item_id as string,
          name: item.name as string,
          unitCode: item.unit_code as string,
          quantity: Number(l.quantity),
          wastePct: l.waste_pct === null ? null : Number(l.waste_pct),
          avgCost: Number(item.avg_cost),
          available: Number(item.available),
        },
      ];
    }),
  };
}

/** Materias primas activas de la fábrica, para armar o editar recetas. */
export async function listRawMaterialOptions(orgId: string): Promise<RawMaterialOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("item_catalog")
    .select("id, name, unit_code")
    .eq("organization_id", orgId)
    .eq("type", "raw_material")
    .eq("status", "active")
    .is("archived_at", null)
    .order("name");
  if (error) throw error;
  return (data ?? []).map((m) => ({
    id: m.id as string,
    name: m.name as string,
    unitCode: m.unit_code as string,
  }));
}
