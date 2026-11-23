import Link from "next/link";

/** Franja del modo demo: avisa que es de sólo lectura y permite volver al sitio. */
export function DemoBanner() {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-brand/40 bg-brand/15 px-4 py-2 text-center text-13"
    >
      <p>
        <strong className="font-semibold">Estás viendo una demo de solo lectura de FABRIL</strong>
        {" · "}Los cambios no se guardan
      </p>
      <Link href="/" className="font-medium underline underline-offset-4">
        Volver al sitio
      </Link>
    </div>
  );
}
