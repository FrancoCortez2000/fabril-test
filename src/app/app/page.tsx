import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/data/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertsPanel } from "@/features/dashboard/components/alerts-panel";
import { InventoryFlowChart } from "@/features/dashboard/components/inventory-flow-chart";
import { KpiRow } from "@/features/dashboard/components/kpi-row";
import { ProductionChart } from "@/features/dashboard/components/production-chart";
import { QuickActions } from "@/features/dashboard/components/quick-actions";
import { RecentActivity } from "@/features/dashboard/components/recent-activity";
import { getDashboard } from "@/features/dashboard/queries";
import { referenceTime } from "@/features/dashboard/reference-time";
import { requireSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Inicio" };

async function DashboardContent() {
  const session = await requireSession();
  const data = await getDashboard(session.activeOrganizationId);
  const currentMonth = data.asOf.slice(0, 7);
  const isDemo = session.organizations.find((o) => o.id === session.activeOrganizationId)?.isDemo;
  const now = referenceTime({
    isDemo: Boolean(isDemo),
    asOf: data.asOf,
    activity: data.activity,
    realNow: new Date(),
  });

  return (
    <>
      <PageHeader
        title="Inicio"
        description={`Estado de la planta al ${formatDate(data.asOf)}.`}
        actions={<QuickActions />}
      />
      <div className="space-y-4">
        <KpiRow kpis={data.kpis} currentMonth={currentMonth} />
        <div className="grid gap-4 lg:grid-cols-3">
          <ProductionChart
            className="lg:col-span-2"
            data={data.monthlyProduction}
            currentMonth={currentMonth}
          />
          <AlertsPanel alerts={data.alerts} />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <InventoryFlowChart
            className="lg:col-span-2"
            data={data.inventoryFlow.filter((m) => m.month < currentMonth)}
          />
          <RecentActivity entries={data.activity} now={now} />
        </div>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-lg" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
