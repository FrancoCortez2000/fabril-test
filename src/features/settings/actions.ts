"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { generalSettingsSchema } from "@/features/settings/schemas";
import { createAction } from "@/lib/actions";
import { ActionError } from "@/lib/db-errors";

const nullIfEmpty = (value: string) => (value === "" ? null : value);

/**
 * Guarda los datos generales de la fábrica activa. La base valida la zona horaria y que el usuario
 * sea administrador (RLS): esta acción es la primera línea, no la única.
 */
export const saveGeneralSettings = createAction({
  schema: generalSettingsSchema,
  permission: "manageSettings",
  handler: async (values, { orgId, supabase }) => {
    const { data, error } = await supabase
      .from("organizations")
      .update({
        name: values.name,
        legal_name: nullIfEmpty(values.legalName),
        cuit: nullIfEmpty(values.cuit),
        address: nullIfEmpty(values.address),
        city: nullIfEmpty(values.city),
        province: nullIfEmpty(values.province),
        phone: nullIfEmpty(values.phone),
        email: nullIfEmpty(values.email),
        timezone: values.timezone,
        default_waste_pct: values.defaultWastePct,
        default_labor_rate: values.defaultLaborRate,
        allow_negative_stock: values.allowNegativeStock,
      })
      .eq("id", orgId)
      .select("id");
    if (error) throw error;
    if (!data?.length) {
      throw new ActionError("No encontramos esa fábrica o no tenés permiso para editarla");
    }
    revalidatePath("/app", "layout");
    return null;
  },
});

/**
 * Restablece los datos de una fábrica demo (borra su historia y genera una nueva). Sólo la puede
 * usar un administrador de esa fábrica, nunca un visitante de la demo pública.
 */
export const resetDemoData = createAction({
  schema: z.object({}),
  permission: "manageSettings",
  handler: async (_input, { orgId, supabase }) => {
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("is_demo")
      .eq("id", orgId)
      .maybeSingle();
    if (orgError) throw orgError;
    if (!org?.is_demo) {
      throw new ActionError("Sólo las organizaciones demo se pueden restablecer");
    }
    const { error } = await supabase.rpc("reset_demo_organization", { p_org: orgId });
    if (error) throw error;
    revalidatePath("/app", "layout");
    return null;
  },
});
