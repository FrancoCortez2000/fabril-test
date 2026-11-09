import { CircleSlash, Clock, PackageMinus, TriangleAlert, type LucideIcon } from "lucide-react";
import Link from "next/link";

import type { DashboardAlert } from "@/features/dashboard/types";
import { cn } from "@/lib/utils";

const KIND: Record<DashboardAlert["kind"], { label: string; icon: LucideIcon; tone: string }> = {
  out_of_stock: { label: "Sin stock", icon: CircleSlash, tone: "text-status-delayed" },
  low_stock: { label: "Stock bajo", icon: PackageMinus, tone: "text-status-pending" },
  delayed_order: { label: "Orden demorada", icon: Clock, tone: "text-status-delayed" },
  late_purchase: { label: "Compra vencida", icon: TriangleAlert, tone: "text-status-pending" },
};

export function AlertsPanel({ alerts }: { alerts: DashboardAlert[] }) {
  return (
    <section className="flex flex-col rounded-lg border bg-surface">
      <header className="flex items-baseline justify-between px-5 pt-4 pb-2">
        <h2 className="text-sm font-semibold">Requiere atención</h2>
        <span className="tabular text-xs text-muted-foreground">{alerts.length} alertas</span>
      </header>
      {alerts.length === 0 ? (
        <p className="px-5 pb-5 text-13 text-muted-foreground">
          Todo en orden: no hay stock bajo ni órdenes demoradas.
        </p>
      ) : (
        <ul className="divide-y">
          {alerts.map((alert, i) => {
            const meta = KIND[alert.kind];
            const Icon = meta.icon;
            return (
              <li key={`${alert.kind}-${i}`}>
                <Link
                  href={alert.href}
                  className="flex gap-3 px-5 py-3 transition-colors hover:bg-accent"
                >
                  <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", meta.tone)} />
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">{meta.label}</span>
                    <span className="block truncate text-13 font-medium">{alert.title}</span>
                    <span className="block text-xs text-muted-foreground">{alert.detail}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
