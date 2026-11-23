"use server";

import { revalidatePath } from "next/cache";

import { allowsDecimals } from "@/features/products/schemas";
import {
  cancelPurchaseSchema,
  confirmPurchaseSchema,
  receivePurchaseSchema,
} from "@/features/purchasing/schemas";
import { createAction, type ActionContext } from "@/lib/actions";
import { ActionError } from "@/lib/db-errors";

function revalidatePurchasing() {
  revalidatePath("/app/compras", "layout");
  revalidatePath("/app/inventario", "layout");
  revalidatePath("/app/materias-primas", "layout");
  revalidatePath("/app");
}

/** Verifica que la orden sea de la fábrica activa (RLS deja ver todas las del usuario). */
async function requirePurchase({ supabase, orgId }: ActionContext, id: string) {
  const { data, error } = await supabase
    .from("purchase_overview")
    .select("id, status")
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ActionError("No encontramos esa orden de compra en esta fábrica");
}

/** Pasa el borrador a pendiente (la base verifica que tenga líneas y siga en borrador). */
export const confirmPurchase = createAction({
  schema: confirmPurchaseSchema,
  permission: "managePurchasing",
  handler: async ({ id }, ctx) => {
    await requirePurchase(ctx, id);
    const { error } = await ctx.supabase.rpc("confirm_purchase_order", { p_id: id });
    if (error) throw error;
    revalidatePurchasing();
    return null;
  },
});

/**
 * Registra la recepción de mercadería: suma stock y actualiza el costo promedio. La base valida que
 * no se reciba más de lo pendiente y que la orden esté pendiente o parcial.
 */
export const receivePurchase = createAction({
  schema: receivePurchaseSchema,
  permission: "managePurchasing",
  handler: async ({ id, deliveryNote, receivedAt, lines }, ctx) => {
    await requirePurchase(ctx, id);
    const { data: own, error: linesError } = await ctx.supabase
      .from("purchase_line_details")
      .select("id, unit_code")
      .eq("organization_id", ctx.orgId)
      .eq("purchase_order_id", id);
    if (linesError) throw linesError;
    const unitByLine = new Map((own ?? []).map((l) => [l.id as string, l.unit_code as string]));
    for (const line of lines) {
      const unit = unitByLine.get(line.lineId);
      if (!unit) throw new ActionError("Una de las líneas no pertenece a esta orden");
      if (!allowsDecimals(unit) && !Number.isInteger(line.quantity)) {
        throw new ActionError("Esta unidad no admite decimales");
      }
    }
    const { data, error } = await ctx.supabase.rpc("receive_purchase_order", {
      p_id: id,
      p_delivery_note: (deliveryNote === "" ? null : deliveryNote) as string, // la función admite null
      p_received_at: receivedAt,
      p_lines: lines.map((l) => ({ line_id: l.lineId, quantity: l.quantity })),
    });
    if (error) throw error;
    revalidatePurchasing();
    return { id: data.id };
  },
});

/** Cancela una orden pendiente o parcial (la base exige el motivo). */
export const cancelPurchase = createAction({
  schema: cancelPurchaseSchema,
  permission: "managePurchasing",
  handler: async ({ id, reason }, ctx) => {
    await requirePurchase(ctx, id);
    const { error } = await ctx.supabase.rpc("cancel_purchase_order", {
      p_id: id,
      p_reason: reason,
    });
    if (error) throw error;
    revalidatePurchasing();
    return null;
  },
});
