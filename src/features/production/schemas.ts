import { z } from "zod";

import { PRIORITY_LABELS } from "@/features/production/types";

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresá una fecha válida")
  .nullable();

/** Nueva orden de producción. Compartida por el formulario y la acción. */
export const orderSchema = z
  .object({
    itemId: z.uuid("Elegí un producto"),
    plannedQty: z
      .number({ error: "Ingresá la cantidad a fabricar" })
      .positive("La cantidad a fabricar tiene que ser mayor a cero"),
    plannedStart: date,
    plannedEnd: date,
    priority: z.enum(Object.keys(PRIORITY_LABELS) as [string, ...string[]], {
      error: "Elegí una prioridad",
    }),
    responsibleId: z.uuid("Elegí un responsable válido").nullable(),
    notes: z.string().trim().max(500, "Máximo 500 caracteres"),
  })
  .refine((o) => !o.plannedStart || !o.plannedEnd || o.plannedEnd >= o.plannedStart, {
    path: ["plannedEnd"],
    message: "La fecha de fin no puede ser anterior a la de inicio",
  });

export type OrderFormValues = z.infer<typeof orderSchema>;
