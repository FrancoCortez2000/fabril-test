"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { useAccess } from "@/components/layout/access-provider";
import { Button } from "@/components/ui/button";
import { resetDemoData } from "@/features/settings/actions";

/** Restablece los datos de una fábrica demo (sólo administradores de esa fábrica). */
export function DemoReset() {
  const router = useRouter();
  const { can } = useAccess();

  async function reset() {
    const result = await resetDemoData({});
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Datos de demostración restablecidos");
    router.refresh();
  }

  return (
    <section
      aria-label="Datos de demostración"
      className="max-w-3xl rounded-lg border bg-surface p-5"
    >
      <h2 className="text-sm font-semibold">Datos de demostración</h2>
      <p className="mt-1 text-13 text-muted-foreground">
        Esta fábrica es una demo. Podés volver a generar sus datos de ejemplo: productos, compras,
        producción y seis meses de movimientos recientes.
      </p>
      <div className="mt-4">
        <ConfirmDialog
          destructive
          trigger={
            <Button variant="outline" disabled={!can("manageSettings")}>
              <RotateCcw aria-hidden />
              Restablecer datos demo
            </Button>
          }
          title="¿Restablecer los datos demo?"
          description="Se borran los movimientos, compras y órdenes actuales de esta fábrica y se generan datos de ejemplo nuevos. Los usuarios no cambian. No se puede deshacer."
          confirmLabel="Restablecer"
          onConfirm={reset}
        />
      </div>
    </section>
  );
}
