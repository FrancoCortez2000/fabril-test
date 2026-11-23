import { z } from "zod";

const ALERT_KINDS = ["low_stock", "out_of_stock", "delayed_order", "late_purchase"] as const;

/** Contrato de `public.dashboard_data(p_org)`: se valida siempre, la base es un borde de confianza. */
const dashboardDataSchema = z.object({
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kpis: z.object({
    products: z.number(),
    rawMaterials: z.number(),
    inventoryValue: z.number(),
    activeOrders: z.number(),
    unitsThisMonth: z.number(),
    unitsSamePeriodLastMonth: z.number(),
  }),
  monthlyProduction: z.array(z.object({ month: z.string(), units: z.number() })),
  inventoryFlow: z.array(
    z.object({ month: z.string(), inValue: z.number(), outValue: z.number() }),
  ),
  alerts: z.array(
    z.object({
      kind: z.enum(ALERT_KINDS),
      title: z.string(),
      detail: z.string(),
      entityType: z.enum(["item", "production_order", "purchase_order"]),
      entityId: z.string(),
      itemType: z.enum(["finished_good", "raw_material"]).nullable(),
    }),
  ),
});

export type DashboardData = z.infer<typeof dashboardDataSchema>;
export type RawAlert = DashboardData["alerts"][number];

export function parseDashboardData(input: unknown): DashboardData {
  return dashboardDataSchema.parse(input);
}

/** Destino de cada alerta: la ficha del ítem, de la orden de producción o de la compra. */
export function alertHref(
  a: Pick<RawAlert, "kind" | "entityType" | "entityId" | "itemType">,
): string {
  if (a.entityType === "item") {
    return a.itemType === "raw_material"
      ? `/app/materias-primas/${a.entityId}`
      : `/app/productos/${a.entityId}`;
  }
  return a.entityType === "production_order"
    ? `/app/produccion/${a.entityId}`
    : `/app/compras/${a.entityId}`;
}
