import { z } from "zod";

/** Unidades de sistema (docs/plan-tecnico.md §4.2). */
export const UNIT_CODES = ["u", "kg", "g", "l", "ml", "m", "m2"] as const;
export type UnitCode = (typeof UNIT_CODES)[number];

export const UNIT_LABELS: Record<UnitCode, string> = {
  u: "Unidad (u)",
  kg: "Kilogramo (kg)",
  g: "Gramo (g)",
  l: "Litro (l)",
  ml: "Mililitro (ml)",
  m: "Metro (m)",
  m2: "Metro cuadrado (m²)",
};

export const PRODUCT_STATUSES = ["active", "inactive"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

const amount = (label: string) =>
  z
    .number({ error: `Ingresá ${label} como número` })
    .min(0, `${label[0]?.toUpperCase()}${label.slice(1)} no puede ser negativo`);

/** Esquema compartido por el formulario (cliente) y la Server Action (Etapa 4). */
export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ingresá un nombre de al menos 2 caracteres")
    .max(120, "Máximo 120 caracteres"),
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Ingresá un código SKU")
    .max(40, "Máximo 40 caracteres")
    .regex(/^[A-Z0-9-]+$/, "Usá letras, números y guiones"),
  description: z.string().trim().max(500, "Máximo 500 caracteres"),
  categoryId: z.uuid("Elegí una categoría válida").nullable(),
  unitCode: z.enum(UNIT_CODES, { error: "Elegí una unidad de medida" }),
  minStock: amount("el stock mínimo"),
  salePrice: amount("el precio de venta").nullable(),
  manualCost: amount("el costo estimado").nullable(),
  status: z.enum(PRODUCT_STATUSES),
});

export type ProductFormValues = z.infer<typeof productSchema>;
