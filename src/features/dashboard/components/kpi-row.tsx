import { Boxes, ClipboardList, Factory, Package, Wallet } from "lucide-react";

import { StatCard } from "@/components/data/stat-card";
import type { DashboardKpis } from "@/features/dashboard/types";
import { formatCurrency, formatMonth, formatNumber } from "@/lib/format";

export function KpiRow({ kpis, currentMonth }: { kpis: DashboardKpis; currentMonth: string }) {
  const change =
    kpis.unitsSamePeriodLastMonth > 0
      ? Math.round(
          ((kpis.unitsThisMonth - kpis.unitsSamePeriodLastMonth) / kpis.unitsSamePeriodLastMonth) *
            100,
        )
      : null;
  const monthName = formatMonth(currentMonth, "long").split(" ")[0];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatCard
        label="Productos"
        value={formatNumber(kpis.products)}
        icon={Package}
        href="/app/productos"
      />
      <StatCard
        label="Materias primas"
        value={formatNumber(kpis.rawMaterials)}
        icon={Boxes}
        href="/app/materias-primas"
      />
      <StatCard
        label="Valor del inventario"
        value={formatCurrency(kpis.inventoryValue, { decimals: 0 })}
        icon={Wallet}
        hint="a costo promedio"
        href="/app/inventario"
      />
      <StatCard
        label="Órdenes activas"
        value={formatNumber(kpis.activeOrders)}
        icon={ClipboardList}
        hint="planificadas, en curso y en calidad"
        href="/app/produccion"
      />
      <StatCard
        label={`Unidades en ${monthName}`}
        value={formatNumber(kpis.unitsThisMonth)}
        icon={Factory}
        delta={
          change === null
            ? undefined
            : { value: change, direction: change >= 0 ? "up" : "down", positiveIsGood: true }
        }
        hint="vs. los mismos días del mes anterior"
      />
    </div>
  );
}
