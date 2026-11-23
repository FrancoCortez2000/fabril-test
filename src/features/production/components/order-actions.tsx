"use client";

import { Ban, CircleCheck, ClipboardList, Play, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { useAccess } from "@/components/layout/access-provider";
import { Button } from "@/components/ui/button";
import { startOrder } from "@/features/production/actions";
import { CancelOrderDialog } from "@/features/production/components/cancel-dialog";
import { CompleteDialog } from "@/features/production/components/complete-dialog";
import { ProgressDialog } from "@/features/production/components/progress-dialog";
import { ShortageDialog } from "@/features/production/components/shortage-dialog";
import { orderShortages } from "@/features/production/shortages";
import type { OrderFull, OrderMaterial } from "@/features/production/types";

type Dialog = "progress" | "complete" | "cancel" | "shortage" | null;

/**
 * Acciones de la ficha según el estado: planificada → iniciar, crear compra con faltantes (si faltan
 * materiales) o cancelar; en producción → registrar avance, completar o cancelar; en control de
 * calidad → completar o cancelar; completada o cancelada → ninguna. En la demo los formularios abren
 * pero no guardan, e Iniciar queda deshabilitado.
 */
export function OrderActions({
  order,
  materials,
  suppliers,
}: {
  order: OrderFull;
  materials: OrderMaterial[];
  suppliers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { can, mode } = useAccess();
  const [dialog, setDialog] = useState<Dialog>(null);
  const allowed = can("manageProduction");
  const { status } = order;

  const canStart = status === "planned";
  const canReport = status === "in_progress";
  const canComplete = status === "in_progress" || status === "quality_check";
  const canCancel = status === "planned" || canComplete;
  const hasShortages = canStart && orderShortages(materials).length > 0;
  if (!canStart && !canComplete && !canCancel) return null;

  const close = (name: Exclude<Dialog, null>) => (open: boolean) => setDialog(open ? name : null);

  async function start() {
    const result = await startOrder({ id: order.id });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Orden ${order.code} iniciada`);
    router.refresh();
  }

  return (
    <>
      {canStart ? (
        allowed ? (
          <ConfirmDialog
            trigger={
              <Button>
                <Play aria-hidden />
                Iniciar
              </Button>
            }
            title={`Iniciar ${order.code}`}
            description="Se consumen del stock los materiales planificados y la orden pasa a producción. Si falta stock, no se puede iniciar."
            confirmLabel="Iniciar producción"
            onConfirm={start}
          />
        ) : (
          <Button
            disabled
            title={mode === "demo" ? "No disponible en la demo" : "No tenés permiso"}
          >
            <Play aria-hidden />
            Iniciar
          </Button>
        )
      ) : null}
      {canReport ? (
        <Button onClick={() => setDialog("progress")}>
          <ClipboardList aria-hidden />
          Registrar avance
        </Button>
      ) : null}
      {canComplete ? (
        <Button variant={canReport ? "outline" : "default"} onClick={() => setDialog("complete")}>
          <CircleCheck aria-hidden />
          Completar
        </Button>
      ) : null}
      {hasShortages ? (
        <Button variant="outline" onClick={() => setDialog("shortage")}>
          <ShoppingCart aria-hidden />
          Crear compra con faltantes
        </Button>
      ) : null}
      {canCancel ? (
        <Button variant="outline" onClick={() => setDialog("cancel")}>
          <Ban aria-hidden />
          Cancelar orden
        </Button>
      ) : null}

      {canReport ? (
        <ProgressDialog
          open={dialog === "progress"}
          onOpenChange={close("progress")}
          order={order}
        />
      ) : null}
      {canComplete ? (
        <CompleteDialog
          open={dialog === "complete"}
          onOpenChange={close("complete")}
          order={order}
        />
      ) : null}
      {hasShortages ? (
        <ShortageDialog
          open={dialog === "shortage"}
          onOpenChange={close("shortage")}
          order={order}
          materials={materials}
          suppliers={suppliers}
        />
      ) : null}
      {canCancel ? (
        <CancelOrderDialog
          open={dialog === "cancel"}
          onOpenChange={close("cancel")}
          order={order}
        />
      ) : null}
    </>
  );
}
