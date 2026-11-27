import { ArrowDown, ArrowRight } from "lucide-react";

import { FLOW } from "@/features/marketing/content";

/**
 * Diagrama "Así se conecta todo": el recorrido completo de una compra hasta el costo real, con el
 * ejemplo de la calculadora. Es HTML (no una imagen): nítido, accesible y con modo oscuro.
 */
export function FlowDiagram() {
  return (
    <figure aria-labelledby="flujo-titulo" className="rounded-xl border bg-surface p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="flujo-titulo" className="font-display text-2xl leading-tight sm:text-3xl">
          Así se conecta todo
        </h2>
        <figcaption className="text-13 text-muted-foreground">
          Ejemplo con el bidón de la calculadora: la compra cubre los 57,5 kg que faltaban.
        </figcaption>
      </div>

      <ol className="mt-6 grid gap-8 lg:grid-cols-4 lg:gap-6">
        {FLOW.map((step, i) => {
          const Icon = step.icon;
          const last = i === FLOW.length - 1;
          return (
            <li key={step.title} className="relative flex flex-col">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-surface-2">
                  <Icon aria-hidden className="size-4" />
                </span>
                <span className="font-mono text-xs text-muted-foreground" aria-hidden>
                  Paso {i + 1}
                </span>
              </div>
              <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-13 text-muted-foreground">{step.body}</p>
              <p className="mt-3 border-l-2 border-brand pl-3 text-13 font-medium lg:mt-auto lg:pt-3">
                {step.result}
              </p>

              {/* Flecha al paso siguiente: a la derecha en escritorio, abajo en el celular. */}
              {last ? null : (
                <>
                  <ArrowRight
                    aria-hidden
                    className="absolute top-2 -right-5 hidden size-4 text-muted-foreground lg:block"
                  />
                  <ArrowDown
                    aria-hidden
                    className="absolute -bottom-7 left-3 size-4 text-muted-foreground lg:hidden"
                  />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
