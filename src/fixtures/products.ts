/**
 * DATOS DE EJEMPLO (Etapa 2) para la maqueta de Productos.
 * En la Etapa 4 la búsqueda, el filtrado, el orden y la paginación los resuelve la consulta SQL.
 */
import type { TableParams } from "@/components/data-table/params";
import type { ProductStatus, UnitCode } from "@/features/products/schemas";
import { stockLevel, type StockLevel } from "@/lib/domain/stock";

export type ProductCategory = { id: string; name: string };

export type ProductRow = {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: ProductCategory | null;
  unitCode: UnitCode;
  currentStock: number;
  minStock: number;
  estimatedCost: number;
  salePrice: number | null;
  status: ProductStatus;
};

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const FIXTURE_CATEGORIES: ProductCategory[] = [
  { id: uuid(101), name: "Bidones" },
  { id: uuid(102), name: "Baldes" },
  { id: uuid(103), name: "Botellas" },
  { id: uuid(104), name: "Tapas" },
  { id: uuid(105), name: "Envases" },
  { id: uuid(106), name: "Cajas organizadoras" },
];

const cat = (name: string) => FIXTURE_CATEGORIES.find((c) => c.name === name) ?? null;

export const FIXTURE_PRODUCTS: ProductRow[] = [
  {
    id: uuid(1),
    sku: "BID-5L-AZ",
    name: "Bidón 5 L azul",
    description: "Bidón de PEAD con asa, tapa a rosca 38 mm.",
    category: cat("Bidones"),
    unitCode: "u",
    currentStock: 3420,
    minStock: 1500,
    estimatedCost: 1186.4,
    salePrice: 2850,
    status: "active",
  },
  {
    id: uuid(2),
    sku: "BID-5L-NAT",
    name: "Bidón 5 L natural",
    description: "",
    category: cat("Bidones"),
    unitCode: "u",
    currentStock: 1980,
    minStock: 1500,
    estimatedCost: 1142.1,
    salePrice: 2700,
    status: "active",
  },
  {
    id: uuid(3),
    sku: "BID-20L-NAT",
    name: "Bidón 20 L natural",
    description: "Para agua y productos de limpieza.",
    category: cat("Bidones"),
    unitCode: "u",
    currentStock: 640,
    minStock: 400,
    estimatedCost: 3920.75,
    salePrice: 8900,
    status: "active",
  },
  {
    id: uuid(4),
    sku: "BAL-10L-BL",
    name: "Balde 10 L blanco",
    description: "Balde de PP con asa metálica y tapa.",
    category: cat("Baldes"),
    unitCode: "u",
    currentStock: 310,
    minStock: 800,
    estimatedCost: 1655,
    salePrice: 3600,
    status: "active",
  },
  {
    id: uuid(5),
    sku: "BAL-20L-BL",
    name: "Balde 20 L blanco con tapa",
    description: "",
    category: cat("Baldes"),
    unitCode: "u",
    currentStock: 1120,
    minStock: 600,
    estimatedCost: 2980.5,
    salePrice: 6400,
    status: "active",
  },
  {
    id: uuid(6),
    sku: "BOT-500-PET",
    name: "Botella 500 ml PET cristal",
    description: "",
    category: cat("Botellas"),
    unitCode: "u",
    currentStock: 18400,
    minStock: 10000,
    estimatedCost: 96.3,
    salePrice: 210,
    status: "active",
  },
  {
    id: uuid(7),
    sku: "BOT-1L-PET",
    name: "Botella 1 L PET cristal",
    description: "",
    category: cat("Botellas"),
    unitCode: "u",
    currentStock: 7300,
    minStock: 8000,
    estimatedCost: 142.8,
    salePrice: 315,
    status: "active",
  },
  {
    id: uuid(8),
    sku: "TAP-28-RS",
    name: "Tapa 28 mm a rosca",
    description: "Para botellas PET.",
    category: cat("Tapas"),
    unitCode: "u",
    currentStock: 42000,
    minStock: 20000,
    estimatedCost: 18.9,
    salePrice: 45,
    status: "active",
  },
  {
    id: uuid(9),
    sku: "TAP-38-RS",
    name: "Tapa 38 mm a rosca",
    description: "Para bidones de 5 L.",
    category: cat("Tapas"),
    unitCode: "u",
    currentStock: 1200,
    minStock: 5000,
    estimatedCost: 31.2,
    salePrice: 70,
    status: "active",
  },
  {
    id: uuid(10),
    sku: "ENV-250-PP",
    name: "Envase 250 g PP con tapa",
    description: "Envase para cosmética y alimentos.",
    category: cat("Envases"),
    unitCode: "u",
    currentStock: 0,
    minStock: 3000,
    estimatedCost: 88.5,
    salePrice: 190,
    status: "active",
  },
  {
    id: uuid(11),
    sku: "ENV-1KG-PP",
    name: "Envase 1 kg PP con tapa",
    description: "",
    category: cat("Envases"),
    unitCode: "u",
    currentStock: 2650,
    minStock: 1500,
    estimatedCost: 214.6,
    salePrice: 460,
    status: "active",
  },
  {
    id: uuid(12),
    sku: "CAJ-ORG-S",
    name: "Caja organizadora chica",
    description: "",
    category: cat("Cajas organizadoras"),
    unitCode: "u",
    currentStock: 860,
    minStock: 300,
    estimatedCost: 1310,
    salePrice: 2990,
    status: "active",
  },
  {
    id: uuid(13),
    sku: "CAJ-ORG-L",
    name: "Caja organizadora grande con trabas",
    description: "Línea discontinuada en 2026.",
    category: cat("Cajas organizadoras"),
    unitCode: "u",
    currentStock: 95,
    minStock: 0,
    estimatedCost: 2875,
    salePrice: null,
    status: "inactive",
  },
];

export const PRODUCT_TABLE_OPTIONS = {
  sortable: ["name", "stock", "cost", "price"],
  filterable: ["categoria", "stock", "estado"],
  defaultSort: { id: "name", desc: false },
};

const SORTERS: Record<string, (a: ProductRow, b: ProductRow) => number> = {
  name: (a, b) => a.name.localeCompare(b.name, "es"),
  stock: (a, b) => a.currentStock - b.currentStock,
  cost: (a, b) => a.estimatedCost - b.estimatedCost,
  price: (a, b) => (a.salePrice ?? -1) - (b.salePrice ?? -1),
};

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Simula la consulta de la Etapa 4 sobre los datos de ejemplo. */
export function queryFixtureProducts(params: TableParams): ProductRow[] {
  const q = normalize(params.q);
  const categories = params.filters.categoria;
  const levels = params.filters.stock as StockLevel[] | undefined;
  const statuses = params.filters.estado;

  const rows = FIXTURE_PRODUCTS.filter((p) => {
    if (q && !normalize(`${p.name} ${p.sku}`).includes(q)) return false;
    if (categories && !categories.includes(p.category?.id ?? "")) return false;
    if (levels && !levels.includes(stockLevel(p.currentStock, p.minStock))) return false;
    if (statuses && !statuses.includes(p.status)) return false;
    return true;
  });

  const sorter = params.sort ? SORTERS[params.sort.id] : undefined;
  if (sorter) {
    rows.sort(sorter);
    if (params.sort?.desc) rows.reverse();
  }
  return rows;
}
