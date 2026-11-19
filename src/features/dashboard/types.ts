/** Contratos del dashboard. En la Etapa 4 se llenan con consultas reales. */

export type DashboardKpis = {
  products: number;
  rawMaterials: number;
  inventoryValue: number;
  activeOrders: number;
  unitsThisMonth: number;
  /** Unidades del mes anterior en los mismos días transcurridos (comparación justa). */
  unitsSamePeriodLastMonth: number;
};

/** 12 meses, `month` en formato `YYYY-MM`. */
export type MonthlyProduction = { month: string; units: number }[];

export type InventoryFlow = { month: string; inValue: number; outValue: number }[];

export type DashboardAlert = {
  kind: "low_stock" | "out_of_stock" | "delayed_order" | "late_purchase";
  title: string;
  detail: string;
  href: string;
};

export type ActivityEntry = {
  id: string;
  summary: string;
  actor: string;
  /** Instante ISO. */
  at: string;
  href?: string;
};
