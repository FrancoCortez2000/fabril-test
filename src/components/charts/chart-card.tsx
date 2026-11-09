"use client";

import { BarChart3, Table2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Contenedor de gráfico: título, leyenda opcional y alternativa en tabla
 * (accesibilidad: los datos nunca dependen sólo del color o del gráfico).
 */
export function ChartCard({
  title,
  description,
  legend,
  chart,
  table,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  legend?: React.ReactNode;
  chart: React.ReactNode;
  table: React.ReactNode;
  className?: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");

  return (
    <section className={cn("flex flex-col rounded-lg border bg-surface", className)}>
      <header className="flex items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-13 text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setView((v) => (v === "chart" ? "table" : "chart"))}
          aria-label={view === "chart" ? "Ver como tabla" : "Ver como gráfico"}
          aria-pressed={view === "table"}
        >
          {view === "chart" ? <Table2 /> : <BarChart3 />}
        </Button>
      </header>
      {legend && view === "chart" ? <div className="px-5 pt-2">{legend}</div> : null}
      <div className="flex-1 px-2 pt-2 pb-3">
        {view === "chart" ? chart : <div className="max-h-72 overflow-auto px-3">{table}</div>}
      </div>
    </section>
  );
}

export function LegendItem({
  color,
  label,
  line = false,
}: {
  color: string;
  label: string;
  line?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        aria-hidden
        className={cn(line ? "h-0.5 w-3.5 rounded-full" : "size-2.5 rounded-sm")}
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

export function ChartTooltipBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-40 rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function TooltipRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <span aria-hidden className="size-2 rounded-sm" style={{ background: color }} />
        {label}
      </span>
      <span className="tabular font-medium text-foreground">{value}</span>
    </div>
  );
}
