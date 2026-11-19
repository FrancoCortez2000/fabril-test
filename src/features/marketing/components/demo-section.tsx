import Link from "next/link";

import { DemoRequestForm } from "@/features/marketing/components/demo-request-form";

export function DemoSection() {
  return (
    <section id="demo" aria-labelledby="demo-titulo" className="scroll-mt-20 border-b">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.3fr] lg:py-20">
        <div className="max-w-md">
          <h2 id="demo-titulo" className="font-display text-4xl leading-tight">
            Mirá FABRIL funcionando con una fábrica de ejemplo
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Te mostramos el sistema en una videollamada de media hora, con una fábrica de ejemplo
            cargada, y vemos juntos si se adapta a tu forma de trabajar.
          </p>
          <p className="mt-4 text-muted-foreground">
            ¿Ya tenés usuario?{" "}
            <Link
              href="/ingresar"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Ingresá al sistema
            </Link>
            .
          </p>
        </div>
        <div className="relative">
          <DemoRequestForm />
        </div>
      </div>
    </section>
  );
}
