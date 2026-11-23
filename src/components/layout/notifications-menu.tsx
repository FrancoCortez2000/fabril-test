"use client";

import { Bell, BellOff } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ALERT_KIND } from "@/features/dashboard/components/alerts-panel";
import type { DashboardAlert } from "@/features/dashboard/types";
import { cn } from "@/lib/utils";

const MAX_BADGE = 9;

/**
 * Alertas calculadas en vivo (stock bajo, sin stock, órdenes demoradas, compras vencidas): las mismas
 * del tablero. El contador se topa en "9+" y la etiqueta accesible conserva la cantidad real.
 */
export function NotificationsMenu({ alerts }: { alerts: DashboardAlert[] }) {
  const count = alerts.length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Alertas: ${count === 0 ? "ninguna" : count}`}
        >
          <Bell />
          {count > 0 ? (
            <span
              data-testid="alerts-count"
              aria-hidden
              className="tabular absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-delayed px-1 text-[10px] leading-none font-semibold text-white"
            >
              {count > MAX_BADGE ? `${MAX_BADGE}+` : count}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Alertas</p>
        </div>
        {count === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
            <BellOff aria-hidden className="size-5 text-muted-foreground" />
            <p className="text-sm font-medium">Sin alertas por ahora</p>
            <p className="text-13 text-muted-foreground">
              Acá vas a ver el stock bajo, las órdenes demoradas y las compras con entrega vencida.
            </p>
          </div>
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {alerts.map((alert, i) => {
              const meta = ALERT_KIND[alert.kind];
              const Icon = meta.icon;
              return (
                <li key={`${alert.kind}-${i}`}>
                  <Link
                    href={alert.href}
                    className="flex gap-3 px-4 py-3 transition-colors hover:bg-accent"
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
      </PopoverContent>
    </Popover>
  );
}
