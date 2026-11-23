import type { ItemFormInitial } from "@/features/items/components/item-form-dialog";
import type { ItemRow } from "@/features/items/types";

/** Valores iniciales del formulario de edición de un ítem. */
export function toFormValues(p: ItemRow): ItemFormInitial {
  return {
    id: p.id,
    kind: p.type,
    name: p.name,
    sku: p.sku,
    description: p.description,
    categoryId: p.category?.id ?? null,
    unitCode: p.unitCode,
    minStock: p.minStock,
    salePrice: p.salePrice,
    standardLaborMinutes: p.standardLaborMinutes,
    overheadPerUnit: p.overheadPerUnit,
    preferredSupplierId: p.preferredSupplierId,
    status: p.status,
  };
}
