import "server-only";

import { z } from "zod";

import { marginPct } from "@/features/items/calc";
import { toItemRow, type CatalogRow } from "@/features/items/queries";
import type { ItemRow } from "@/features/items/types";
import { toMovementRow } from "@/features/inventory/movement-row";
import type { MovementRow } from "@/features/inventory/types";
import { createClient } from "@/lib/supabase/server";

// Lecturas de la ficha de un producto o materia prima. Todas filtran por la fábrica activa: RLS deja
// ver todas las fábricas del usuario (más la demo pública), no sólo la activa.

const uuid = z.uuid();

export type ItemCosting = { materials: number; labor: number; overhead: number; standard: number };

export type ItemDetail = {
  item: ItemRow;
  /** Desglose del costo estándar por unidad; sólo productos con receta. */
  costing: ItemCosting | null;
  marginPct: number | null;
};

export async function getItem(orgId: string, id: string): Promise<ItemDetail | null> {
  if (!uuid.safeParse(id).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("item_catalog")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const item = toItemRow(data as unknown as CatalogRow);
  let costing: ItemCosting | null = null;
  if (item.type === "finished_good") {
    const { data: c, error: costingError } = await supabase
      .from("item_costing")
      .select("materials_cost, labor_cost, overhead_cost, standard_cost")
      .eq("item_id", id)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (costingError) throw costingError;
    if (c) {
      costing = {
        materials: Number(c.materials_cost),
        labor: Number(c.labor_cost),
        overhead: Number(c.overhead_cost),
        standard: Number(c.standard_cost),
      };
    }
  }
  return { item, costing, marginPct: marginPct(item.salePrice, costing?.standard ?? null) };
}

/** Movimientos del ítem (kardex), del más nuevo al más viejo. */
export async function listItemMovements(
  orgId: string,
  itemId: string,
  limit = 50,
): Promise<MovementRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("movement_feed")
    .select("*")
    .eq("organization_id", orgId)
    .eq("item_id", itemId)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toMovementRow);
}

export type UsedInRow = {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  wastePct: number | null;
  outputQty: number;
};

/** Productos cuya receta lleva esta materia prima. */
export async function listUsedIn(orgId: string, itemId: string): Promise<UsedInRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bom_usage")
    .select("product_id, product_name, product_sku, quantity, waste_pct, output_qty")
    .eq("organization_id", orgId)
    .eq("item_id", itemId)
    .order("product_name");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    productId: r.product_id as string,
    productName: r.product_name as string,
    productSku: r.product_sku as string,
    quantity: Number(r.quantity),
    wastePct: r.waste_pct === null ? null : Number(r.waste_pct),
    outputQty: Number(r.output_qty),
  }));
}

export type PurchaseLineRow = {
  purchaseId: string;
  code: string;
  status: string;
  orderDate: string;
  expectedDate: string | null;
  quantity: number;
  receivedQty: number;
  unitPrice: number;
  supplierName: string;
};

/** Últimas compras de una materia prima. */
export async function listRecentPurchases(
  orgId: string,
  itemId: string,
  limit = 5,
): Promise<PurchaseLineRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("item_purchase_lines")
    .select(
      "purchase_id, purchase_code, status, order_date, expected_date, quantity, received_qty, unit_price, supplier_name",
    )
    .eq("organization_id", orgId)
    .eq("item_id", itemId)
    .order("order_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    purchaseId: r.purchase_id as string,
    code: r.purchase_code as string,
    status: r.status as string,
    orderDate: r.order_date as string,
    expectedDate: (r.expected_date as string | null) ?? null,
    quantity: Number(r.quantity),
    receivedQty: Number(r.received_qty),
    unitPrice: Number(r.unit_price),
    supplierName: r.supplier_name as string,
  }));
}

export type ProductOrderRow = {
  id: string;
  code: string;
  status: string;
  plannedQty: number;
  goodQty: number;
  progressPct: number;
  isDelayed: boolean;
  plannedEndDate: string | null;
};

/** Últimas órdenes de producción de un producto. */
export async function listProductOrders(
  orgId: string,
  itemId: string,
  limit = 10,
): Promise<ProductOrderRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_order_overview")
    .select("id, code, status, planned_qty, good_qty, progress_pct, is_delayed, planned_end_date")
    .eq("organization_id", orgId)
    .eq("item_id", itemId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    code: r.code as string,
    status: r.status as string,
    plannedQty: Number(r.planned_qty),
    goodQty: Number(r.good_qty),
    progressPct: Number(r.progress_pct),
    isDelayed: Boolean(r.is_delayed),
    plannedEndDate: (r.planned_end_date as string | null) ?? null,
  }));
}

/** Proveedores de la fábrica, para el desplegable de "proveedor preferido". */
export async function listSuppliers(orgId: string): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name");
  if (error) throw error;
  return (data ?? []).map((s) => ({ id: s.id as string, name: s.name as string }));
}
