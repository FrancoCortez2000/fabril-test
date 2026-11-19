/** Colores de gráficos desde los tokens (cambian solos con el tema). */
export const CHART_COLORS = {
  highlight: "var(--chart-1)",
  highlightStroke: "var(--chart-highlight-stroke)",
  neutral: "var(--chart-2)",
  inflow: "var(--chart-3)",
  outflow: "var(--chart-4)",
  grid: "var(--chart-grid)",
  axis: "var(--muted-foreground)",
} as const;

export const AXIS_TICK = { fill: CHART_COLORS.axis, fontSize: 12 } as const;
