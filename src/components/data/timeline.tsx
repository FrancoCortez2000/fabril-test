import { formatDateTime } from "@/lib/format";

export type TimelineItem = {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Instante ISO. */
  at: string;
  actor?: string;
};

/** Historial vertical (cambios de estado, actividad reciente). */
export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative space-y-5 border-l pl-5">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span
            aria-hidden
            className="absolute top-1.5 -left-[25px] size-2 rounded-full border-2 border-surface bg-muted-foreground ring-1 ring-border"
          />
          <div className="text-sm">{item.title}</div>
          {item.description ? (
            <div className="mt-0.5 text-13 text-muted-foreground">{item.description}</div>
          ) : null}
          <div className="tabular mt-1 text-xs text-muted-foreground">
            <time dateTime={item.at}>{formatDateTime(item.at)}</time>
            {item.actor ? <> · {item.actor}</> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
