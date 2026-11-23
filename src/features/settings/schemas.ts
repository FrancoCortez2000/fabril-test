import { z } from "zod";

const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`);

/**
 * Datos generales de la fábrica. Los textos opcionales pueden quedar vacíos (se guardan como nulos).
 * La zona horaria la valida además la base contra `pg_timezone_names`.
 */
export const generalSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ingresá un nombre de al menos 2 caracteres")
    .max(120, "Máximo 120 caracteres"),
  legalName: text(160),
  cuit: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^\d{2}-\d{8}-\d$/.test(v),
      "El CUIT tiene que tener el formato 30-12345678-9",
    ),
  address: text(200),
  city: text(80),
  province: text(80),
  phone: text(40),
  email: z
    .string()
    .trim()
    .max(120, "Máximo 120 caracteres")
    .refine((v) => v === "" || z.email().safeParse(v).success, "Ingresá un email válido"),
  timezone: z.string().trim().min(1, "Elegí una zona horaria").max(64, "Máximo 64 caracteres"),
  defaultWastePct: z
    .number({ error: "Ingresá el desperdicio como número" })
    .min(0, "El desperdicio no puede ser negativo")
    .max(100, "El desperdicio no puede superar 100 %"),
  defaultLaborRate: z
    .number({ error: "Ingresá el costo hora como número" })
    .min(0, "El costo hora no puede ser negativo"),
  allowNegativeStock: z.boolean(),
});

export type GeneralSettingsValues = z.infer<typeof generalSettingsSchema>;
