import Link from "next/link";

import { Button } from "@/components/ui/button";

export function DemoSection() {
  return (
    <section id="demo" aria-labelledby="demo-titulo" className="scroll-mt-20 border-b">
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6 lg:py-20">
        <h2 id="demo-titulo" className="font-display text-4xl leading-tight">
          Recorré FABRIL con una fábrica de ejemplo
        </h2>
        <p className="mx-auto mt-4 max-w-[52ch] text-base text-muted-foreground">
          Sin registrarte y sin instalar nada. Entrás a una fábrica de plásticos con seis meses de
          historia: producción, inventario, recetas, compras y costos. Es de solo lectura, así que
          podés abrir todo sin miedo a romper algo.
        </p>
        <div className="mt-8">
          <Button size="lg" asChild>
            <Link href="/demo" prefetch={false}>
              Probar la demo
            </Link>
          </Button>
        </div>
        <p className="mt-6 text-muted-foreground">
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
    </section>
  );
}
