import { z } from "zod";

const name = (label: string) =>
  z.string().trim().min(1, `Ingresá ${label}`).max(80, "Máximo 80 caracteres");

/** Alta o edición de un empleado (con `id` es edición). */
export const employeeSchema = z.object({
  id: z.uuid().optional(),
  firstName: name("el nombre"),
  lastName: name("el apellido"),
  position: z.string().trim().max(80, "Máximo 80 caracteres"),
  areaId: z.uuid("Elegí un área válida").nullable(),
  hourlyCost: z
    .number({ error: "Ingresá el costo por hora como número" })
    .min(0, "El costo por hora no puede ser negativo")
    .nullable(),
  status: z.enum(["active", "on_leave", "inactive"], { error: "Elegí un estado válido" }),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;

/** Columnas de `employees` a guardar: los textos vacíos pasan a `null`. */
export function toEmployeePayload(values: Omit<EmployeeFormValues, "id">) {
  return {
    first_name: values.firstName,
    last_name: values.lastName,
    position: values.position.trim() === "" ? null : values.position.trim(),
    area_id: values.areaId,
    hourly_cost: values.hourlyCost,
    status: values.status,
  };
}
