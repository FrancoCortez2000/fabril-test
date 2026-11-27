"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * Tarjeta para una tabla o lista de una ficha: marco, encabezado con título (y opcionalmente una
 * descripción, un dato como "Últimos 50" y acciones a la derecha) y el contenido. Las tablas de
 * adentro ganan margen lateral para alinear con el encabezado.
 */
export function TableCard({
  title,
  description,
  meta,
  actions,
  className,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn("overflow-hidden rounded-lg border bg-surface", className)}
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-5 py-3.5">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <h2 id={id} className="text-sm font-semibold">
              {title}
            </h2>
            {meta ? <span className="tabular text-xs text-muted-foreground">{meta}</span> : null}
          </div>
          {description ? (
            <p className="mt-0.5 text-13 text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      <div className="[&_td:first-child]:pl-5 [&_td:last-child]:pr-5 [&_th:first-child]:pl-5 [&_th:last-child]:pr-5 [&_thead_tr]:bg-surface-2/50">
        {children}
      </div>
    </section>
  );
}

/** Mensaje de "todavía no hay…" dentro de una `TableCard`. */
export function TableCardEmpty({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-6 text-13 text-muted-foreground">{children}</p>;
}
