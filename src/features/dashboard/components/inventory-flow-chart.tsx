"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard, ChartTooltipBox, LegendItem, TooltipRow } from "@/components/charts/chart-card";
import { AXIS_TICK, CHART_COLORS } from "@/components/charts/chart-theme";
import type { InventoryFlow } from "@/features/dashboard/types";
import { formatCompactCurrency, formatCurrency, formatMonth } from "@/lib/format";

const SERIES = [
  { key: "inValue", label: "Entradas", color: CHART_COLORS.inflow },
  { key: "outValue", label: "Salidas", color: CHART_COLORS.outflow },
] as const;

export function InventoryFlowChart({
  className,
  data,
}: {
  className?: string;
  data: InventoryFlow;
}) {
  const rows = data.map((d) => ({ ...d, label: formatMonth(d.month, "short") }));

  return (
    <ChartCard
      className={className}
      title="Movimientos de inventario"
      description="Entradas y salidas valorizadas · meses completos"
      legend={
        <div className="flex gap-4">
          {SERIES.map((s) => (
            <LegendItem key={s.key} color={s.color} label={s.label} line />
          ))}
        </div>
      }
      chart={
        <div className="relative h-64 w-full lg:h-72">
          <div className="absolute inset-0">
            <ResponsiveContainer>
              <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
                <XAxis
                  dataKey="label"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  width={64}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => formatCompactCurrency(v)}
                />
                <Tooltip
                  cursor={{ stroke: CHART_COLORS.axis, strokeWidth: 1, strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    const p = payload?.[0]?.payload as (typeof rows)[number] | undefined;
                    if (!active || !p) return null;
                    return (
                      <ChartTooltipBox title={formatMonth(p.month, "long")}>
                        {SERIES.map((s) => (
                          <TooltipRow
                            key={s.key}
                            color={s.color}
                            label={s.label}
                            value={formatCompactCurrency(p[s.key])}
                          />
                        ))}
                      </ChartTooltipBox>
                    );
                  }}
                />
                {SERIES.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      }
      table={
        <table className="w-full text-13">
          <caption className="sr-only">
            Entradas y salidas de inventario valorizadas por mes
          </caption>
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-2 text-left font-medium">Mes</th>
              <th className="py-2 text-right font-medium">Entradas</th>
              <th className="py-2 text-right font-medium">Salidas</th>
            </tr>
          </thead>
          <tbody className="tabular divide-y">
            {data.map((d) => (
              <tr key={d.month}>
                <td className="py-1.5 capitalize">{formatMonth(d.month, "long")}</td>
                <td className="py-1.5 text-right">{formatCurrency(d.inValue, { decimals: 0 })}</td>
                <td className="py-1.5 text-right">{formatCurrency(d.outValue, { decimals: 0 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    />
  );
}
