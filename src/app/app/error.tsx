"use client";

import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Si una pantalla del panel falla, el resto (menú y encabezado) sigue en pie y se puede reintentar. */
export default function PanelError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <TriangleAlert aria-hidden className="size-8 text-muted-foreground" />
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold">No pudimos cargar esta pantalla</h1>
        <p className="text-13 text-muted-foreground">
          Pasó algo de nuestro lado. Probá de nuevo; si sigue fallando, volvé al inicio.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>Reintentar</Button>
        <Button variant="outline" asChild>
          <a href="/app">Ir al inicio</a>
        </Button>
      </div>
    </div>
  );
}
