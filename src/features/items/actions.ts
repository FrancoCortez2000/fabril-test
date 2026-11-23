"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { saveItemSchema, toItemPayload } from "@/features/items/schemas";
import { createAction } from "@/lib/actions";
import { ActionError } from "@/lib/db-errors";

function revalidateCatalog() {
  revalidatePath("/app/productos", "layout");
  revalidatePath("/app/materias-primas", "layout");
  revalidatePath("/app/inventario", "layout");
  revalidatePath("/app");
}

/**
 * Crea o edita un producto o materia prima de la fábrica activa. La unidad se envía siempre: la base
 * rechaza el cambio si el ítem ya tiene movimientos. El tipo no se puede cambiar.
 */
export const saveItem = createAction({
  schema: saveItemSchema,
  permission: "manageCatalog",
  handler: async ({ id, ...values }, { orgId, supabase }) => {
    const { data: units, error: unitError } = await supabase
      .from("units")
      .select("id")
      .eq("code", values.unitCode);
    if (unitError) throw unitError;
    const unitId = units?.[0]?.id;
    if (unitId === undefined) throw new ActionError("Elegí una unidad de medida");

    const payload = { ...toItemPayload(values), unit_id: unitId };

    if (id) {
      const { data, error } = await supabase
        .from("items")
        .update(payload)
        .eq("id", id)
        .eq("organization_id", orgId)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new ActionError("No encontramos ese ítem en esta fábrica");
      revalidateCatalog();
      return { id };
    }

    const { data, error } = await supabase
      .from("items")
      .insert({ ...payload, organization_id: orgId, type: values.kind })
      .select("id");
    if (error) throw error;
    const created = data?.[0]?.id;
    if (!created) throw new ActionError("No pudimos guardar el ítem. Probá de nuevo.");
    revalidateCatalog();
    return { id: created };
  },
});

/** Archiva o reactiva un ítem (no se borra: conserva su historia). */
export const setItemArchived = createAction({
  schema: z.object({ id: z.uuid(), archived: z.boolean() }),
  permission: "manageCatalog",
  handler: async ({ id, archived }, { orgId, supabase }) => {
    const { data, error } = await supabase
      .from("items")
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq("id", id)
      .eq("organization_id", orgId)
      .select("id");
    if (error) throw error;
    if (!data?.length) throw new ActionError("No encontramos ese ítem en esta fábrica");
    revalidateCatalog();
    return null;
  },
});
