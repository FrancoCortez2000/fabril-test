import { z } from "zod";

const reason = (message: string) =>
  z.string().trim().min(3, message).max(200, "Máximo 200 caracteres");

/**
 * Entrada o salida manual de stock. La entrada puede informar el costo unitario (si no, se usa el
 * costo promedio); la salida nunca lo informa. Compartido por el formulario y la acción.
 */
export const movementSchema = z
  .object({
    itemId: z.uuid(),
    type: z.enum(["manual_in", "manual_out"]),
    quantity: z
      .number({ error: "Ingresá la cantidad como número" })
      .positive("La cantidad tiene que ser mayor a cero"),
    unitCost: z
      .number({ error: "Ingresá el costo como número" })
      .min(0, "El costo no puede ser negativo")
      .nullable(),
    reason: reason("Indicá el motivo del movimiento"),
  })
  .refine((m) => m.type === "manual_in" || m.unitCost === null, {
    path: ["unitCost"],
    message: "El costo sólo se informa en las entradas",
  });

export type MovementFormValues = z.infer<typeof movementSchema>;

/** Ajuste por conteo físico: la cantidad que hay realmente, no la diferencia. */
export const adjustmentSchema = z.object({
  itemId: z.uuid(),
  countedQty: z
    .number({ error: "Ingresá la cantidad contada como número" })
    .min(0, "La cantidad contada no puede ser negativa"),
  reason: reason("Indicá el motivo del ajuste"),
});

export type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;
