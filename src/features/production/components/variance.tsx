import { costVariance } from "@/features/production/costs";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Desvío dicho con palabras (no sólo con color): "$ 10.000,00 más caro (+10 %)". */
export function Variance({ planned, actual }: { planned: number; actual: number | null }) {
  const v = costVariance(planned, actual);
  if (!v) return <span className="text-muted-foreground">—</span>;
  if (v.amount === 0) return <span className="text-muted-foreground">Sin desvío</span>;
  const dearer = v.amount > 0;
  return (
    <span className={cn(dearer ? "text-status-delayed" : "text-status-completed")}>
      {formatCurrency(Math.abs(v.amount))} {dearer ? "más caro" : "más barato"}
      {v.pct === null ? "" : ` (${dearer ? "+" : "-"}${formatPercent(Math.abs(v.pct))})`}
    </span>
  );
}
