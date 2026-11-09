import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

const TONES = {
  default: "bg-foreground/80",
  success: "bg-status-completed",
  danger: "bg-status-delayed",
} as const;

export function ProgressBar({
  value,
  tone = "default",
  label,
  showValue = true,
  className,
}: {
  /** 0 a 100. */
  value: number;
  tone?: keyof typeof TONES;
  label?: string;
  showValue?: boolean;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="progressbar"
        aria-label={label ?? "Progreso"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"
      >
        <div className={cn("h-full rounded-full", TONES[tone])} style={{ width: `${pct}%` }} />
      </div>
      {showValue ? (
        <span className="tabular w-11 shrink-0 text-right text-xs text-muted-foreground">
          {formatPercent(Math.round(pct), 0)}
        </span>
      ) : null}
    </div>
  );
}
