import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export type StatDelta = {
  /** Variación en puntos porcentuales (12 = +12 %). */
  value: number;
  direction: "up" | "down";
  /** Si subir es bueno (unidades producidas) o malo (desperdicio). */
  positiveIsGood: boolean;
};

export function StatCard({
  label,
  value,
  hint,
  delta,
  icon: Icon,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  delta?: StatDelta;
  icon?: LucideIcon;
  href?: string;
}) {
  const good = delta ? (delta.direction === "up") === delta.positiveIsGood : false;
  const DeltaIcon = delta?.direction === "up" ? ArrowUpRight : ArrowDownRight;

  const body = (
    <>
      <div className="flex items-center justify-between gap-2 text-13 text-muted-foreground">
        <span>{label}</span>
        {Icon ? <Icon aria-hidden className="size-4" /> : null}
      </div>
      <div className="tabular mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {delta || hint ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {delta ? (
            <span
              className={cn(
                "tabular inline-flex items-center gap-0.5 font-medium",
                good ? "text-status-completed" : "text-status-delayed",
              )}
            >
              <DeltaIcon aria-hidden className="size-3.5" />
              <span className="sr-only">{delta.direction === "up" ? "Subió" : "Bajó"}</span>
              {formatPercent(Math.abs(delta.value), 0)}
            </span>
          ) : null}
          {hint ? <span>{hint}</span> : null}
        </div>
      ) : null}
    </>
  );

  const className = "block rounded-lg border bg-surface p-4";

  return href ? (
    <Link href={href} className={cn(className, "transition-colors hover:border-foreground/25")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
