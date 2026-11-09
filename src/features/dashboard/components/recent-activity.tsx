import type { ActivityEntry } from "@/features/dashboard/types";
import { formatDateTime, formatRelative } from "@/lib/format";

export function RecentActivity({ entries, now }: { entries: ActivityEntry[]; now: Date }) {
  return (
    <section className="flex flex-col rounded-lg border bg-surface">
      <header className="px-5 pt-4 pb-2">
        <h2 className="text-sm font-semibold">Actividad reciente</h2>
      </header>
      {entries.length === 0 ? (
        <p className="px-5 pb-5 text-13 text-muted-foreground">
          Cuando registres compras, órdenes o movimientos, vas a verlos acá.
        </p>
      ) : (
        <ol className="divide-y">
          {entries.map((e) => (
            <li key={e.id} className="px-5 py-3">
              <p className="text-13">{e.summary}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <time dateTime={e.at} title={formatDateTime(e.at)}>
                  {formatRelative(e.at, now)}
                </time>{" "}
                · {e.actor}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
