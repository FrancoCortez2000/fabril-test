"use client";

import { Bell, BellOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Alertas calculadas en vivo (stock bajo, órdenes demoradas, compras vencidas).
 * Se alimentan con datos reales en la Etapa 4.
 */
export function NotificationsMenu() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Alertas">
          <Bell />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Alertas</p>
        </div>
        <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
          <BellOff aria-hidden className="size-5 text-muted-foreground" />
          <p className="text-sm font-medium">Sin alertas por ahora</p>
          <p className="text-13 text-muted-foreground">
            Acá vas a ver el stock bajo, las órdenes demoradas y las compras con entrega vencida.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
