import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BUILD_FACTS, REPO_URL, STACK } from "@/features/marketing/content";

/** "Cómo está hecho": lo que la demo no puede mostrar (seguridad, base de datos y pruebas). */
export function BuiltWith() {
  return (
    <section
      id="como-esta-hecho"
      aria-labelledby="como-esta-hecho-titulo"
      className="scroll-mt-20 border-b"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h2 id="como-esta-hecho-titulo" className="font-display text-4xl leading-tight">
              Cómo está hecho
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Lo que no se ve en la demo: dónde vive la lógica, cómo se protegen los datos y cómo se
              prueba.
            </p>
          </div>
          <Button variant="outline" asChild>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              Ver el código en GitHub
              <ExternalLink aria-hidden />
            </a>
          </Button>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {BUILD_FACTS.map((fact) => {
            const Icon = fact.icon;
            return (
              <li key={fact.title} className="flex gap-4 rounded-xl border bg-surface p-5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-surface-2">
                  <Icon aria-hidden className="size-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold">{fact.title}</h3>
                  <p className="mt-1.5 text-13 text-muted-foreground">{fact.body}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-8">
          <p className="text-xs font-medium text-muted-foreground">Tecnologías</p>
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Tecnologías">
            {STACK.map((tech) => (
              <li key={tech} className="rounded-md border bg-surface px-2.5 py-1 font-mono text-xs">
                {tech}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
