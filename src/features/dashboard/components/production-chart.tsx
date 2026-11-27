"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard, ChartTooltipBox, TooltipRow } from "@/components/charts/chart-card";
import { AXIS_TICK, CHART_COLORS } from "@/components/charts/chart-theme";
import type { MonthlyProduction } from "@/features/dashboard/types";
import { formatMonth, formatNumber } from "@/lib/format";

export function ProductionChart({
  className,
  data,
  currentMonth,
}: {
  className?: string;
  data: MonthlyProduction;
  currentMonth: string;
}) {
  const rows = data.map((d) => ({ ...d, label: formatMonth(d.month, "short") }));
  const current = data.find((d) => d.month === currentMonth);

  return (
    <ChartCard
      className={className}
      title="Producción mensual"
      description={
        current
          ? `Unidades buenas por mes · ${formatMonth(currentMonth, "long")} en curso: ${formatNumber(current.units)} u`
          : "Unidades buenas por mes"
      }
      chart={
        <div className="relative h-64 w-full lg:h-auto lg:min-h-80 lg:flex-1">
          {/* Posición absoluta: el contenedor mide el alto real de la tarjeta, no el del contenido. */}
          <div className="absolute inset-0">
            <ResponsiveContainer>
              <BarChart
                data={rows}
                margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
                barCategoryGap={6}
              >
                <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
                <XAxis
                  dataKey="label"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  width={44}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${formatNumber(v / 1000)} mil` : formatNumber(v)
                  }
                />
                <Tooltip
                  cursor={{ fill: "var(--accent)" }}
                  content={({ active, payload }) => {
                    const p = payload?.[0]?.payload as (typeof rows)[number] | undefined;
                    if (!active || !p) return null;
                    const isCurrent = p.month === currentMonth;
                    return (
                      <ChartTooltipBox
                        title={`${formatMonth(p.month, "long")}${isCurrent ? " (en curso)" : ""}`}
                      >
                        <TooltipRow
                          color={isCurrent ? CHART_COLORS.highlight : CHART_COLORS.neutral}
                          label="Unidades"
                          value={formatNumber(p.units)}
                        />
                      </ChartTooltipBox>
                    );
                  }}
                />
                <Bar dataKey="units" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {rows.map((r) => {
                    const isCurrent = r.month === currentMonth;
                    return (
                      <Cell
                        key={r.month}
                        fill={isCurrent ? CHART_COLORS.highlight : CHART_COLORS.neutral}
                        stroke={isCurrent ? CHART_COLORS.highlightStroke : "none"}
                        strokeWidth={isCurrent ? 1 : 0}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      }
      table={
        <table className="w-full text-13">
          <caption className="sr-only">Unidades producidas por mes</caption>
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-2 text-left font-medium">Mes</th>
              <th className="py-2 text-right font-medium">Unidades</th>
            </tr>
          </thead>
          <tbody className="tabular divide-y">
            {data.map((d) => (
              <tr key={d.month}>
                <td className="py-1.5 capitalize">{formatMonth(d.month, "long")}</td>
                <td className="py-1.5 text-right">{formatNumber(d.units)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    />
  );
}
