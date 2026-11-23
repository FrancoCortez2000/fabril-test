import { ImageIcon } from "lucide-react";

/**
 * Marco de captura del sistema. Con `src` muestra una captura real tomada de la demo
 * (`npm run capturas`); sin `src` queda el marco vacío.
 */
export function ScreenshotFrame({ label, src }: { label: string; src?: string }) {
  return (
    <figure className="overflow-hidden rounded-xl border bg-surface shadow-sm">
      <div className="flex items-center gap-1.5 border-b bg-surface-2/70 px-3 py-2" aria-hidden>
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
      </div>
      {src ? (
        // Captura estática de public/: el tamaño fijo evita saltos de layout al cargar.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={label}
          width={1440}
          height={900}
          loading="lazy"
          className="block h-auto w-full"
        />
      ) : (
        <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 bg-[repeating-linear-gradient(135deg,transparent_0_10px,var(--surface-2)_10px_11px)] text-center">
          <ImageIcon aria-hidden className="size-5 text-muted-foreground" />
          <p className="text-13 text-muted-foreground">Captura de la pantalla</p>
        </div>
      )}
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}
