import type { PurchaseLineDetail, PurchaseRow } from "@/features/purchasing/types";

export const PO_ID = "11111111-1111-4111-8111-111111111111";
export const LINE_A = "22222222-2222-4222-8222-222222222222";
export const LINE_B = "33333333-3333-4333-8333-333333333333";

export const purchase = (over: Partial<PurchaseRow> = {}): PurchaseRow => ({
  id: PO_ID,
  code: "OC-2026-0001",
  status: "partially_received",
  orderDate: "2026-09-01",
  expectedDate: "2026-10-01",
  notes: null,
  subtotal: 13000,
  taxTotal: 2730,
  total: 15730,
  cancelReason: null,
  supplierId: "44444444-4444-4444-8444-444444444444",
  supplierName: "Petroquímica Sur",
  lineCount: 2,
  receivedPct: 50,
  isLate: false,
  ...over,
});

export const lines: PurchaseLineDetail[] = [
  {
    id: LINE_A,
    itemId: "55555555-5555-4555-8555-555555555555",
    itemName: "PEAD",
    sku: "PEAD",
    unitCode: "kg",
    quantity: 100,
    unitPrice: 50,
    taxRate: 21,
    receivedQty: 100,
    pendingQty: 0,
    lineTotal: 5000,
  },
  {
    id: LINE_B,
    itemId: "66666666-6666-4666-8666-666666666666",
    itemName: "Masterbatch",
    sku: "MB",
    unitCode: "kg",
    quantity: 100,
    unitPrice: 80,
    taxRate: 21,
    receivedQty: 0,
    pendingQty: 100,
    lineTotal: 8000,
  },
];
