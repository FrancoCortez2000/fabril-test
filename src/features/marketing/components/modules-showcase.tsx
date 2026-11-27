import { Check } from "lucide-react";

import { ScreenshotFrame } from "@/features/marketing/components/screenshot-frame";
import { MODULES } from "@/features/marketing/content";
import { cn } from "@/lib/utils";

export function ModulesShowcase() {
  return (
    <section
      id="funcionalidades"
      aria-labelledby="funcionalidades-titulo"
      className="scroll-mt-20 border-b"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="max-w-2xl">
          <h2 id="funcionalidades-titulo" className="font-display text-4xl leading-tight">
            Todo lo que pasa en la planta, conectado
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Cinco módulos que comparten los mismos datos: lo que cargás en uno ya está en los demás.
            Las capturas son de la demo, con la fábrica de ejemplo.
          </p>
        </div>

        <div className="mt-14 space-y-16 lg:space-y-24">
          {MODULES.map((m, i) => {
            const Icon = m.icon;
            return (
              <article
                key={m.id}
                className={cn(
                  "grid items-center gap-8 lg:gap-10",
                  i % 2 === 1
                    ? "lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
                    : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]",
                )}
                aria-labelledby={`modulo-${m.id}`}
              >
                <div className={cn("max-w-lg", i % 2 === 1 && "lg:order-2")}>
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-md border bg-surface">
                      <Icon aria-hidden className="size-4" />
                    </span>
                    <h3 id={`modulo-${m.id}`} className="text-xl font-semibold">
                      {m.title}
                    </h3>
                  </div>
                  <p className="mt-4 text-base text-muted-foreground">{m.summary}</p>
                  <ul className="mt-5 space-y-2.5">
                    {m.points.map((pt) => (
                      <li key={pt} className="flex gap-2.5">
                        <Check
                          aria-hidden
                          className="mt-0.5 size-4 shrink-0 text-status-completed"
                        />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <ScreenshotFrame label={`Pantalla de ${m.title} en FABRIL`} src={m.screenshot} />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
