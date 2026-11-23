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

const units = (label: string) =>
  z
    .number({ error: `Ingresá ${label} como número` })
    .min(0, `${label[0]?.toUpperCase()}${label.slice(1)}: la cantidad no puede ser negativa`);

const reason = (message: string) =>
  z.string().trim().min(3, message).max(200, "Máximo 200 caracteres");

export const startOrderSchema = z.object({ id: z.uuid() });

/** Parte de avance: al menos una unidad buena o defectuosa. */
export const reportProgressSchema = z
  .object({
    id: z.uuid(),
    good: units("las unidades buenas"),
    defective: units("las unidades defectuosas"),
    notes: z.string().trim().max(300, "Máximo 300 caracteres"),
  })
  .refine((v) => v.good + v.defective > 0, {
    path: ["good"],
    message: "Indicá unidades buenas o defectuosas (mayores a cero)",
  });

export type ReportProgressValues = z.infer<typeof reportProgressSchema>;

/** Completar la orden: cantidades finales (los consumos reales los toma la base de lo ya consumido). */
export const completeOrderSchema = z.object({
  id: z.uuid(),
  good: units("las unidades buenas finales"),
  defective: units("las unidades defectuosas finales"),
  note: z.string().trim().max(300, "Máximo 300 caracteres"),
});

export type CompleteOrderValues = z.infer<typeof completeOrderSchema>;

export const cancelOrderSchema = z.object({
  id: z.uuid(),
  reason: reason("Indicá el motivo de la cancelación"),
});

export type CancelOrderValues = z.infer<typeof cancelOrderSchema>;

export const shortagePurchaseSchema = z.object({
  orderId: z.uuid(),
  supplierId: z.uuid("Elegí un proveedor"),
});
