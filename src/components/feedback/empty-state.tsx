import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Un estado vacío explica qué falta y ofrece la acción para empezar. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-4 flex size-10 items-center justify-center rounded-md border bg-surface-2">
        <Icon aria-hidden className="size-5 text-muted-foreground" />
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 max-w-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
