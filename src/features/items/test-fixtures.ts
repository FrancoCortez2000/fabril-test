import type { ItemDetail } from "@/features/items/detail-queries";
import type { ItemRow } from "@/features/items/types";
import type { MovementRow } from "@/features/inventory/types";

export const ITEM_ID = "11111111-1111-4111-8111-111111111111";

export const productRow: ItemRow = {
  id: ITEM_ID,
  type: "finished_good",
  sku: "BID-5L",
  name: "Bidón 5 L",
  description: "Bidón con asa",
  category: { id: "22222222-2222-4222-8222-222222222222", name: "Bidones" },
  unitCode: "u",
  currentStock: 50,
  minStock: 10,
  avgCost: 1700,
  standardCost: 1778,
  cost: 1778,
  salePrice: 2850,
  standardLaborMinutes: 15,
  overheadPerUnit: 20,
  preferredSupplierId: null,
  lastPurchaseCost: null,
  committed: 5,
  available: 45,
  hasMovements: true,
  status: "active",
  archived: false,
  level: "ok",
};

export const rawMaterialRow: ItemRow = {
  ...productRow,
  type: "raw_material",
  sku: "PEAD",
  name: "PEAD",
  unitCode: "kg",
  currentStock: 300,
  minStock: 500,
  avgCost: 1000,
  standardCost: null,
  cost: 1000,
  salePrice: null,
  standardLaborMinutes: 0,
  overheadPerUnit: 0,
  lastPurchaseCost: 1100,
  committed: 20,
  available: 280,
  level: "low",
};

export const productDetail: ItemDetail = {
  item: productRow,
  costing: { materials: 258, labor: 1500, overhead: 20, standard: 1778 },
  marginPct: 37.6,
};

export const rawMaterialDetail: ItemDetail = {
  item: rawMaterialRow,
  costing: null,
  marginPct: null,
};

export const movement = (over: Partial<MovementRow> = {}): MovementRow => ({
  id: "m1",
  occurredAt: "2026-10-01T15:00:00+00:00",
  itemId: ITEM_ID,
  itemName: "PEAD",
  sku: "PEAD",
  unitCode: "kg",
  type: "purchase_receipt",
  quantity: 100,
  unitCost: 50,
  totalCost: 5000,
  balanceAfter: 100,
  reason: null,
  reference: "OC-2026-0001",
  reversible: false,
  reversed: false,
  ...over,
});
