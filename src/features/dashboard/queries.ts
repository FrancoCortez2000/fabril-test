import "server-only";

import { alertHref, parseDashboardData } from "@/features/dashboard/data";
import type {
  ActivityEntry,
  DashboardAlert,
  DashboardKpis,
  InventoryFlow,
  MonthlyProduction,
} from "@/features/dashboard/types";
import { createClient } from "@/lib/supabase/server";

export type DashboardView = {
  asOf: string;
  kpis: DashboardKpis;
  monthlyProduction: MonthlyProduction;
  inventoryFlow: InventoryFlow;
  alerts: DashboardAlert[];
  activity: ActivityEntry[];
};

/**
 * Datos del tablero de una fábrica. La visibilidad la define la base (RLS / guarda de las funciones):
 * una fábrica que el usuario no puede ver devuelve todo en cero.
 */
export async function getDashboard(orgId: string): Promise<DashboardView> {
  const supabase = await createClient();
  const [dashboard, activity] = await Promise.all([
    supabase.rpc("dashboard_data", { p_org: orgId }),
    supabase.rpc("recent_activity", { p_org: orgId, p_limit: 8 }),
  ]);
  if (dashboard.error) throw dashboard.error;
  if (activity.error) throw activity.error;

  const data = parseDashboardData(dashboard.data);
  return {
    asOf: data.asOf,
    kpis: data.kpis,
    monthlyProduction: data.monthlyProduction,
    inventoryFlow: data.inventoryFlow,
    alerts: data.alerts.map((a) => ({
      kind: a.kind,
      title: a.title,
      detail: a.detail,
      href: alertHref(a),
    })),
    activity: (activity.data ?? []).map((a) => ({
      id: a.id,
      summary: a.summary,
      actor: a.actor_name,
      at: a.occurred_at,
    })),
  };
}
