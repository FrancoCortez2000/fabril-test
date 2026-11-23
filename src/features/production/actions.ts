"use server";

import { revalidatePath } from "next/cache";

import { orderSchema } from "@/features/production/schemas";
import { createAction } from "@/lib/actions";
import { ActionError } from "@/lib/db-errors";

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
