import Link from "next/link";

import { Button } from "@/components/ui/button";
import { BomCalculator } from "@/features/marketing/components/bom-calculator";
import { FlowDiagram } from "@/features/marketing/components/flow-diagram";

export function Hero() {
  return (
    <section className="border-b">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-24">
        <div className="max-w-xl">
          <h1 className="font-display text-5xl leading-[1.02] text-balance sm:text-6xl lg:text-[4.5rem]">
            Sabé qué fabricar, con qué material y a qué costo.
          </h1>
          <p className="mt-6 max-w-[52ch] text-base text-muted-foreground sm:text-lg sm:leading-8">
            FABRIL ordena la producción, el stock, las recetas y las compras de tu fábrica en un
            solo lugar. Probá la calculadora: es la misma que usa el sistema para planificar cada
            orden.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/demo" prefetch={false}>
                Probar la demo
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#funcionalidades">Ver funcionalidades</a>
            </Button>
          </div>
        </div>
        <BomCalculator />
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24">
        <FlowDiagram />
      </div>
    </section>
  );
}
