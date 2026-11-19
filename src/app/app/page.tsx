import type { Metadata } from "next";

import { PageHeader } from "@/components/data/page-header";
import { SampleDataBadge } from "@/components/data/sample-data-badge";
import { AlertsPanel } from "@/features/dashboard/components/alerts-panel";
import { InventoryFlowChart } from "@/features/dashboard/components/inventory-flow-chart";
import { KpiRow } from "@/features/dashboard/components/kpi-row";
import { ProductionChart } from "@/features/dashboard/components/production-chart";
import { QuickActions } from "@/features/dashboard/components/quick-actions";
import { RecentActivity } from "@/features/dashboard/components/recent-activity";
import {
  FIXTURE_ACTIVITY,
  FIXTURE_ALERTS,
  FIXTURE_INVENTORY_FLOW,
  FIXTURE_KPIS,
  FIXTURE_MONTHLY_PRODUCTION,
  FIXTURE_NOW,
  FIXTURE_TODAY,
} from "@/fixtures/dashboard";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Inicio" };

export default function DashboardPage() {
  const currentMonth = FIXTURE_TODAY.slice(0, 7);

  return (
    <>
      <PageHeader
        title="Inicio"
        meta={<SampleDataBadge />}
        description={`Estado de la planta al ${formatDate(FIXTURE_TODAY)}.`}
        actions={<QuickActions />}
      />
      <div className="space-y-4">
        <KpiRow kpis={FIXTURE_KPIS} currentMonth={currentMonth} />
        <div className="grid gap-4 lg:grid-cols-3">
          <ProductionChart
            className="lg:col-span-2"
            data={FIXTURE_MONTHLY_PRODUCTION}
            currentMonth={currentMonth}
          />
          <AlertsPanel alerts={FIXTURE_ALERTS} />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <InventoryFlowChart
            className="lg:col-span-2"
            data={FIXTURE_INVENTORY_FLOW.filter((m) => m.month < currentMonth)}
          />
          <RecentActivity entries={FIXTURE_ACTIVITY} now={FIXTURE_NOW} />
        </div>
      </div>
    </>
  );
}
