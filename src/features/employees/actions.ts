"use server";

import { revalidatePath } from "next/cache";

import { employeeSchema, toEmployeePayload } from "@/features/employees/schemas";
import { createAction } from "@/lib/actions";
import { ActionError } from "@/lib/db-errors";

/**
 * Da de alta o edita un empleado de la fábrica activa. La fábrica sale siempre de la sesión; el área
 * se verifica contra ella y la edición se acota por id y fábrica (otra fábrica = 0 filas). Las bajas
 * son un cambio de estado a "inactivo": no se borra a nadie.
 */
export const saveEmployee = createAction({
  schema: employeeSchema,
  permission: "manageEmployees",
  handler: async ({ id, ...values }, { orgId, supabase }) => {
    if (values.areaId) {
      const { data: area, error: areaError } = await supabase
        .from("areas")
        .select("id")
        .eq("id", values.areaId)
        .eq("organization_id", orgId)
        .maybeSingle();
      if (areaError) throw areaError;
      if (!area) throw new ActionError("No encontramos esa área en esta fábrica");
    }

    const payload = toEmployeePayload(values);

    if (id) {
      const { data, error } = await supabase
        .from("employees")
        .update(payload)
        .eq("id", id)
        .eq("organization_id", orgId)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new ActionError("No encontramos a ese empleado en esta fábrica");
      revalidatePath("/app/empleados", "layout");
      return { id };
    }

    const { data, error } = await supabase
      .from("employees")
      .insert({ ...payload, organization_id: orgId })
      .select("id");
    if (error) throw error;
    const created = data?.[0]?.id;
    if (!created) throw new ActionError("No pudimos guardar al empleado. Probá de nuevo.");
    revalidatePath("/app/empleados", "layout");
    return { id: created as string };
  },
});
