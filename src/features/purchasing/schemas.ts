import { z } from "zod";

/** Hoy en Buenos Aires (YYYY-MM-DD): una recepción no puede ser de una fecha futura. */
export function todayInBuenosAires(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(
    new Date(),
  );
}

const reason = (message: string) =>
  z.string().trim().min(3, message).max(200, "Máximo 200 caracteres");

export const confirmPurchaseSchema = z.object({ id: z.uuid() });

export const cancelPurchaseSchema = z.object({
  id: z.uuid(),
  reason: reason("Indicá el motivo de la cancelación"),
});

export type CancelPurchaseValues = z.infer<typeof cancelPurchaseSchema>;

/** Recepción de mercadería: sólo las líneas con cantidad, sin repetir ninguna. */
export const receivePurchaseSchema = z.object({
  id: z.uuid(),
  deliveryNote: z.string().trim().max(40, "Máximo 40 caracteres"),
  receivedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresá una fecha válida")
    .refine((d) => d <= todayInBuenosAires(), "La fecha de recepción no puede ser futura"),
  lines: z
    .array(
      z.object({
        lineId: z.uuid(),
        quantity: z
          .number({ error: "Ingresá la cantidad como número" })
          .positive("La cantidad tiene que ser mayor a cero"),
      }),
    )
    .min(1, "Indicá la cantidad recibida de al menos un material")
    .refine(
      (lines) => new Set(lines.map((l) => l.lineId)).size === lines.length,
      "No repitas una línea",
    ),
});

export type ReceivePurchaseValues = z.infer<typeof receivePurchaseSchema>;
