import { cn } from "@/lib/utils";

/**
 * Marca de FABRIL: el perfil de techo en diente de sierra de una nave industrial,
 * con el último diente en el color de señal.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 24" aria-hidden className={cn("h-6 w-7", className)}>
      <path d="M1 23V13l8-6v6l8-6v6l8-6v16H1Z" className="fill-foreground" />
      <path d="M17 13l8-6v6Z" className="fill-brand" />
      <rect x="5" y="16" width="3" height="7" className="fill-background" />
      <rect x="12" y="16" width="3" height="7" className="fill-background" />
    </svg>
  );
}

export function Logo({
  className,
  collapsed = false,
}: {
  className?: string;
  collapsed?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      {collapsed ? (
        <span className="sr-only">FABRIL</span>
      ) : (
        <span className="font-display text-xl tracking-[0.06em]">FABRIL</span>
      )}
    </span>
  );
}
