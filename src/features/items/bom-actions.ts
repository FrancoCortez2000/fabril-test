"use server";

import { revalidatePath } from "next/cache";

import { saveBomSchema } from "@/features/items/bom-schemas";
import { createAction } from "@/lib/actions";

/**
 * Guarda la receta completa de un producto (crea o reemplaza). La validación definitiva, el permiso
 * de administrador y el reemplazo atómico de las líneas los hace la función `save_bom` de la base.
 */
export const saveBom = createAction({
  schema: saveBomSchema,
  permission: "manageCatalog",
  handler: async ({ itemId, outputQty, defaultWastePct, notes, lines }, { supabase }) => {
    const { data, error } = await supabase.rpc("save_bom", {
      p_item: itemId,
      p_output_qty: outputQty,
      p_default_waste_pct: defaultWastePct as number, // la función admite null
      p_notes: notes,
      p_lines: lines,
    });
    if (error) throw error;
    revalidatePath("/app/productos", "layout");
    revalidatePath("/app/materias-primas", "layout");
    return { id: data as string };
  },
});
