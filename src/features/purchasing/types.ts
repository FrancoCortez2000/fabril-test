import type { PurchaseStatus } from "@/lib/domain/status";

export type { PurchaseStatus };

/** Fila de la lista de compras (vista `purchase_overview`). */
export type PurchaseRow = {
  id: string;
  code: string;
  status: PurchaseStatus;
  orderDate: string;
  expectedDate: string | null;
  notes: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  cancelReason: string | null;
  supplierId: string;
  supplierName: string;
  lineCount: number;
  /** 0 a 100: lo recibido sobre lo pedido. */
  receivedPct: number;
  /** Pendiente o parcial con la fecha de entrega vencida. */
  isLate: boolean;
};

/** Línea de una compra (vista `purchase_line_details`). */
export type PurchaseLineDetail = {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  unitCode: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  receivedQty: number;
  pendingQty: number;
  /** Cantidad por precio, sin IVA. */
  lineTotal: number;
};
