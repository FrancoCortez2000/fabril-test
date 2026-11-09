import { ImageIcon } from "lucide-react";

/**
 * Marco de captura del sistema. En la Etapa 5 recibe capturas reales
 * tomadas de la app con los datos de demostración.
 */
export function ScreenshotFrame({ label }: { label: string }) {
  return (
    <figure className="overflow-hidden rounded-xl border bg-surface">
      <div className="flex items-center gap-1.5 border-b bg-surface-2/70 px-3 py-2" aria-hidden>
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
      </div>
      <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 bg-[repeating-linear-gradient(135deg,transparent_0_10px,var(--surface-2)_10px_11px)] text-center">
        <ImageIcon aria-hidden className="size-5 text-muted-foreground" />
        <p className="text-13 text-muted-foreground">Captura real en la Etapa 5</p>
      </div>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}
