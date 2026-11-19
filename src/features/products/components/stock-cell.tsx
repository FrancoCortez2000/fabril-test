import { formatQuantity } from "@/lib/format";
import { STOCK_LEVEL_LABELS, stockLevel } from "@/lib/domain/stock";
import { cn } from "@/lib/utils";

/** Stock actual con indicador de nivel (ícono de texto + color, nunca sólo color). */
export function StockCell({
  current,
  min,
  unitCode,
  className,
}: {
  current: number;
  min: number;
  unitCode: string;
  className?: string;
}) {
  const level = stockLevel(current, min);
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="tabular">{formatQuantity(current, unitCode)}</span>
      {level !== "ok" ? (
        <span
          className={cn(
            "rounded-sm px-1.5 py-0.5 text-[11px] font-medium",
            level === "out"
              ? "bg-status-delayed/10 text-status-delayed"
              : "bg-status-pending/15 text-foreground",
          )}
        >
          {STOCK_LEVEL_LABELS[level]}
        </span>
      ) : null}
    </span>
  );
}
