import {
  PRODUCTION_STATUS,
  PURCHASE_STATUS,
  type ProductionStatus,
  type PurchaseStatus,
  type StatusMeta,
} from "@/lib/domain/status";
import { cn } from "@/lib/utils";

type StatusBadgeProps = (
  { kind: "production"; status: ProductionStatus } | { kind: "purchase"; status: PurchaseStatus }
) & {
  /** Agrega la marca "Demorada" (condición calculada, no un estado). */
  delayed?: boolean;
  className?: string;
};

function Dot({ color }: { color: string }) {
  return <span aria-hidden className={cn("size-2 shrink-0 rounded-full", color)} />;
}

/** Estado con punto de color y texto neutro: la paleta se mantiene sobria en tablas densas. */
export function StatusBadge(props: StatusBadgeProps) {
  const meta: StatusMeta =
    props.kind === "production" ? PRODUCTION_STATUS[props.status] : PURCHASE_STATUS[props.status];

  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap", props.className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-13 text-foreground",
          props.status === "cancelled" && "text-muted-foreground line-through decoration-1",
        )}
      >
        <Dot color={meta.color} />
        {meta.label}
      </span>
      {props.delayed ? (
        <span className="inline-flex items-center gap-1 rounded-sm bg-status-delayed/10 px-1.5 py-0.5 text-xs font-medium text-status-delayed">
          Demorada
        </span>
      ) : null}
    </span>
  );
}
