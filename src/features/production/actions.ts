"use server";

import { revalidatePath } from "next/cache";

import {
  cancelOrderSchema,
  completeOrderSchema,
  orderSchema,
  reportProgressSchema,
  shortagePurchaseSchema,
  startOrderSchema,
} from "@/features/production/schemas";
import { createAction, type ActionContext } from "@/lib/actions";
import { ActionError, mapDbError } from "@/lib/db-errors";

function revalidateProduction() {
  revalidatePath("/app/produccion", "layout");
  revalidatePath("/app/inventario", "layout");
  revalidatePath("/app/productos", "layout");
  revalidatePath("/app/materias-primas", "layout");
  revalidatePath("/app");
}

/**
 * Planifica una orden de producción: la base calcula los materiales (según la receta y el desperdicio),
 * los compromete y fija el costo planificado. Falla si el producto no tiene receta.
 */
export const createOrder = createAction({
  schema: orderSchema,
  permission: "manageProduction",
  handler: async (
    { itemId, plannedQty, plannedStart, plannedEnd, priority, responsibleId, notes },
    { supabase, orgId },
  ) => {
    // RLS deja ver todas las fábricas del usuario: el producto y el responsable tienen que ser de la activa.
    const { data: item, error: itemError } = await supabase
      .from("item_catalog")
      .select("id")
      .eq("id", itemId)
      .eq("organization_id", orgId)
      .eq("type", "finished_good")
      .maybeSingle();
    if (itemError) throw itemError;
    if (!item) throw new ActionError("No encontramos ese producto en esta fábrica");

    if (responsibleId) {
      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("id")
        .eq("id", responsibleId)
        .eq("organization_id", orgId)
        .maybeSingle();
      if (employeeError) throw employeeError;
      if (!employee) throw new ActionError("No encontramos a ese empleado en esta fábrica");
    }

    const { data, error } = await supabase.rpc("create_production_order", {
      p_item: itemId,
      p_planned_qty: plannedQty,
      p_planned_start: plannedStart as string, // la función admite null
      p_planned_end: plannedEnd as string,
      p_priority: priority,
      p_responsible: responsibleId as string,
      p_employee_ids: [],
      p_notes: (notes === "" ? null : notes) as string,
    });
    if (error) throw error;
    revalidateProduction();
    return { id: data.id };
  },
});

/**
 * Verifica que la orden sea de la fábrica activa (RLS deja ver todas las del usuario) y devuelve su
 * estado y su mano de obra planificada.
 */
async function requireOrder(
  { supabase, orgId }: ActionContext,
  id: string,
): Promise<{ status: string; plannedLaborCost: number }> {
  const { data, error } = await supabase
    .from("production_order_overview")
    .select("id, status, planned_labor_cost")
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ActionError("No encontramos esa orden de producción en esta fábrica");
  return { status: data.status as string, plannedLaborCost: Number(data.planned_labor_cost) };
}

/**
 * Horas de mano de obra al completar. Sin una pantalla para cargarlas, las horas planificadas (costo
 * de mano de obra planificado / costo hora de la fábrica) se reparten entre el personal asignado que
 * todavía no tiene horas: así el costo real incluye mano de obra y es comparable con el planificado.
 */
async function laborHours(
  { supabase, orgId }: ActionContext,
  orderId: string,
  plannedLaborCost: number,
): Promise<{ employee_id: string; hours: number }[]> {
  const [team, org] = await Promise.all([
    supabase
      .from("production_team")
      .select("employee_id, hours_worked")
      .eq("organization_id", orgId)
      .eq("production_order_id", orderId),
    supabase.from("organizations").select("default_labor_rate").eq("id", orgId).maybeSingle(),
  ]);
  if (team.error) throw team.error;
  if (org.error) throw org.error;
  const rate = Number(org.data?.default_labor_rate ?? 0);
  const idle = (team.data ?? []).filter((t) => Number(t.hours_worked) === 0);
  if (rate <= 0 || plannedLaborCost <= 0 || idle.length === 0) return [];
  const share = Math.round((plannedLaborCost / rate / idle.length) * 10) / 10;
  return idle.map((t) => ({ employee_id: t.employee_id as string, hours: share }));
}

/** Inicia la orden: consume los materiales planificados (la base verifica que alcance el stock). */
export const startOrder = createAction({
  schema: startOrderSchema,
  permission: "manageProduction",
  handler: async ({ id }, ctx) => {
    await requireOrder(ctx, id);
    const { error } = await ctx.supabase.rpc("start_production_order", { p_id: id });
    if (error) throw error;
    revalidateProduction();
    return null;
  },
});

/** Registra un parte de avance (unidades buenas y defectuosas) de una orden en producción. */
export const reportProgress = createAction({
  schema: reportProgressSchema,
  permission: "manageProduction",
  handler: async ({ id, good, defective, notes }, ctx) => {
    await requireOrder(ctx, id);
    const { error } = await ctx.supabase.rpc("report_production_progress", {
      p_id: id,
      p_good: good,
      p_defective: defective,
      p_employee: null as unknown as string, // la función admite null
      p_report_date: null as unknown as string,
      p_notes: notes,
    });
    if (error) throw error;
    revalidateProduction();
    return null;
  },
});

/**
 * Completa la orden con las cantidades finales. Desde "en producción" pasa antes por control de
 * calidad; si el segundo paso falla, la orden queda en control de calidad y se puede volver a
 * completar (el mensaje lo avisa). Los consumos reales son los ya registrados al iniciar.
 */
export const completeOrder = createAction({
  schema: completeOrderSchema,
  permission: "manageProduction",
  handler: async ({ id, good, defective, note }, ctx) => {
    const { status, plannedLaborCost } = await requireOrder(ctx, id);
    const hours = await laborHours(ctx, id, plannedLaborCost);
    if (status === "in_progress") {
      const { error } = await ctx.supabase.rpc("send_to_quality_check", { p_id: id });
      if (error) throw error;
    }
    const { error } = await ctx.supabase.rpc("complete_production_order", {
      p_id: id,
      p_good: good,
      p_defective: defective,
      p_consumptions: [],
      p_hours: hours,
      p_note: (note === "" ? null : note) as string,
    });
    if (error) {
      if (status === "in_progress") {
        throw new ActionError(
          `${mapDbError(error)} La orden quedó en control de calidad; podés volver a completarla.`,
        );
      }
      throw error;
    }
    revalidateProduction();
    return null;
  },
});

/** Cancela una orden planificada, en producción o en control de calidad (la base exige el motivo). */
export const cancelOrder = createAction({
  schema: cancelOrderSchema,
  permission: "manageProduction",
  handler: async ({ id, reason }, ctx) => {
    await requireOrder(ctx, id);
    const { error } = await ctx.supabase.rpc("cancel_production_order", {
      p_id: id,
      p_reason: reason,
      p_returns: [],
    });
    if (error) throw error;
    revalidateProduction();
    return null;
  },
});

/** Crea una compra borrador con los materiales que faltan para esta orden planificada. */
export const createPurchaseFromShortages = createAction({
  schema: shortagePurchaseSchema,
  permission: "manageProduction",
  handler: async ({ orderId, supplierId }, ctx) => {
    await requireOrder(ctx, orderId);
    const { data: supplier, error: supplierError } = await ctx.supabase
      .from("suppliers")
      .select("id")
      .eq("id", supplierId)
      .eq("organization_id", ctx.orgId)
      .maybeSingle();
    if (supplierError) throw supplierError;
    if (!supplier) throw new ActionError("No encontramos a ese proveedor en esta fábrica");

    const { data, error } = await ctx.supabase.rpc("create_purchase_from_shortages", {
      p_order: orderId,
      p_supplier: supplierId,
    });
    if (error) throw error;
    revalidateProduction();
    revalidatePath("/app/compras", "layout");
    return { id: data.id };
  },
});
