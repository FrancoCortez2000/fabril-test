import type { UnitCode } from "@/features/products/schemas";
import type { StockLevel } from "@/lib/domain/stock";

export type ItemKind = "finished_good" | "raw_material";

export type ItemCategory = { id: string; name: string };

/** Fila de las listas de Productos y Materias primas (vista `item_catalog`). */
export type ItemRow = {
  id: string;
  type: ItemKind;
  sku: string;
  name: string;
  description: string;
  category: ItemCategory | null;
  unitCode: UnitCode;
  currentStock: number;
  minStock: number;
  /** Costo promedio ponderado del stock. */
  avgCost: number;
  /** Costo estándar por unidad (sólo productos con receta). */
  standardCost: number | null;
  /** Costo que muestra la lista: promedio para materias primas, estándar para productos. */
  cost: number | null;
  salePrice: number | null;
  standardLaborMinutes: number;
  overheadPerUnit: number;
  preferredSupplierId: string | null;
  lastPurchaseCost: number | null;
  committed: number;
  available: number;
  /** Con movimientos de stock: la unidad ya no se puede cambiar. */
  hasMovements: boolean;
  status: "active" | "inactive";
  archived: boolean;
  level: StockLevel;
};

/** Rutas de cada tipo de ítem. */
export const ITEM_PATHS: Record<ItemKind, string> = {
  finished_good: "/app/productos",
  raw_material: "/app/materias-primas",
};

export const ITEM_LABELS: Record<
  ItemKind,
  { singular: string; plural: string; newLabel: string; costLabel: string }
> = {
  finished_good: {
    singular: "producto",
    plural: "productos",
    newLabel: "Nuevo producto",
    costLabel: "Costo estándar",
  },
  raw_material: {
    singular: "materia prima",
    plural: "materias primas",
    newLabel: "Nueva materia prima",
    costLabel: "Costo promedio",
  },
};
