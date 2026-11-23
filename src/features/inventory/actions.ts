"use server";

import { revalidatePath } from "next/cache";

import { adjustmentSchema, movementSchema, reverseSchema } from "@/features/inventory/schemas";
import { allowsDecimals } from "@/features/products/schemas";
import { createAction, type ActionContext } from "@/lib/actions";
import { ActionError } from "@/lib/db-errors";

function revalidateInventory() {
  revalidatePath("/app/inventario", "layout");
  revalidatePath("/app/productos", "layout");
  revalidatePath("/app/materias-primas", "layout");
  revalidatePath("/app");
}

/** Unidad del ítem, verificando que sea de la fábrica activa (RLS deja ver todas las del usuario). */
async function itemUnit({ supabase, orgId }: ActionContext, itemId: string): Promise<string> {
  const { data, error } = await supabase
    .from("item_catalog")
    .select("unit_code")
    .eq("id", itemId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ActionError("No encontramos ese ítem en esta fábrica");
  return data.unit_code as string;
}

function requireWholeUnits(unitCode: string, quantity: number) {
  if (!allowsDecimals(unitCode) && !Number.isInteger(quantity)) {
    throw new ActionError("Esta unidad no admite decimales");
  }
}

/**
 * Entrada o salida manual. La RPC `create_manual_movement` valida el permiso de administrador, el
 * motivo y que no quede stock negativo, y registra el movimiento en el libro.
 */
export const registerMovement = createAction({
  schema: movementSchema,
  permission: "manageInventory",
  handler: async ({ itemId, type, quantity, unitCost, reason }, ctx) => {
    requireWholeUnits(await itemUnit(ctx, itemId), quantity);
    const { data, error } = await ctx.supabase.rpc("create_manual_movement", {
      p_item: itemId,
      p_type: type,
      p_quantity: quantity,
      p_reason: reason,
      p_unit_cost: unitCost as number, // la función admite null (salidas y entradas al costo promedio)
    });
    if (error) throw error;
    revalidateInventory();
    return { id: data.id };
  },
});

/** Ajuste por conteo físico: deja el stock en la cantidad contada y registra la diferencia. */
export const registerAdjustment = createAction({
  schema: adjustmentSchema,
  permission: "manageInventory",
  handler: async ({ itemId, countedQty, reason }, ctx) => {
    requireWholeUnits(await itemUnit(ctx, itemId), countedQty);
    const { data, error } = await ctx.supabase.rpc("create_stock_adjustment", {
      p_item: itemId,
      p_counted_qty: countedQty,
      p_reason: reason,
    });
    if (error) throw error;
    revalidateInventory();
    return { id: data.id };
  },
});

/**
 * Revierte un movimiento manual o un ajuste (los demás se corrigen desde su compra u orden). La RPC
 * `reverse_stock_movement` valida el permiso, el motivo y que no esté ya revertido.
 */
export const reverseMovement = createAction({
  schema: reverseSchema,
  permission: "manageInventory",
  handler: async ({ movementId, reason }, { supabase, orgId }) => {
    const { data: found, error: findError } = await supabase
      .from("movement_feed")
      .select("id")
      .eq("id", movementId)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (findError) throw findError;
    if (!found) throw new ActionError("No encontramos ese movimiento en esta fábrica");

    const { data, error } = await supabase.rpc("reverse_stock_movement", {
      p_movement: movementId,
      p_reason: reason,
    });
    if (error) throw error;
    revalidateInventory();
    return { id: data.id };
  },
});
