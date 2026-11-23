import { z } from "zod";

import { PRODUCT_STATUSES, UNIT_CODES } from "@/features/products/schemas";

const amount = (label: string) =>
  z
    .number({ error: `Ingresá ${label} como número` })
    .min(0, `${label[0]?.toUpperCase()}${label.slice(1)} no puede ser negativo`);

/**
 * Formulario de producto o materia prima, compartido por el cliente y la Server Action.
 * No tiene costo manual: la base no lo usa para costear. Los campos que no corresponden al tipo
 * (precio y mano de obra en una materia prima, proveedor en un producto) se descartan en
 * `toItemPayload`.
 */
export const itemSchema = z.object({
  kind: z.enum(["finished_good", "raw_material"]),
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
  status: z.enum(PRODUCT_STATUSES),
  salePrice: amount("el precio de venta").nullable(),
  standardLaborMinutes: amount("los minutos de mano de obra"),
  overheadPerUnit: amount("los gastos indirectos"),
  preferredSupplierId: z.uuid("Elegí un proveedor válido").nullable(),
});

export type ItemFormValues = z.infer<typeof itemSchema>;

export const saveItemSchema = itemSchema.extend({ id: z.uuid().optional() });

/** Columnas de `items` que escribe el formulario (sin organización, tipo ni unidad: las pone la acción). */
export function toItemPayload(values: ItemFormValues) {
  const isProduct = values.kind === "finished_good";
  return {
    sku: values.sku,
    name: values.name,
    description: values.description === "" ? null : values.description,
    category_id: values.categoryId,
    min_stock: values.minStock,
    status: values.status,
    sale_price: isProduct ? values.salePrice : null,
    standard_labor_minutes: isProduct ? values.standardLaborMinutes : 0,
    overhead_per_unit: isProduct ? values.overheadPerUnit : 0,
    preferred_supplier_id: isProduct ? null : values.preferredSupplierId,
  };
}
