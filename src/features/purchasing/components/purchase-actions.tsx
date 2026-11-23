"use client";

import { Ban, CircleCheck, PackageCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { useAccess } from "@/components/layout/access-provider";
import { Button } from "@/components/ui/button";
import { confirmPurchase } from "@/features/purchasing/actions";
import { CancelPurchaseDialog } from "@/features/purchasing/components/cancel-dialog";
import { ReceiveDialog } from "@/features/purchasing/components/receive-dialog";
import type { PurchaseLineDetail, PurchaseRow } from "@/features/purchasing/types";

/**
 * Acciones de la ficha según el estado: borrador → confirmar o cancelar; pendiente o parcial →
 * recibir o cancelar; el resto no tiene acciones. En la demo, Recibir y Cancelar abren su formulario
 * (que no guarda) y Confirmar queda deshabilitado.
 */
export function PurchaseActions({
  purchase,
  lines,
}: {
  purchase: PurchaseRow;
  lines: PurchaseLineDetail[];
}) {
  const router = useRouter();
  const { can, mode } = useAccess();
  const [dialog, setDialog] = useState<"receive" | "cancel" | null>(null);
  const allowed = can("managePurchasing");
  const { status } = purchase;

  const canConfirm = status === "draft";
  const canReceive = status === "pending" || status === "partially_received";
  const canCancel = canConfirm || canReceive;
  if (!canConfirm && !canReceive && !canCancel) return null;

  async function confirm() {
    const result = await confirmPurchase({ id: purchase.id });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Orden ${purchase.code} confirmada`);
    router.refresh();
  }

  return (
    <>
      {canConfirm ? (
        allowed ? (
          <ConfirmDialog
            trigger={
              <Button>
                <CircleCheck aria-hidden />
                Confirmar
              </Button>
            }
            title={`Confirmar ${purchase.code}`}
            description="La orden pasa a pendiente y queda lista para recibir la mercadería. Ya no se puede editar."
            confirmLabel="Confirmar orden"
            onConfirm={confirm}
          />
        ) : (
          <Button
            disabled
            title={mode === "demo" ? "No disponible en la demo" : "No tenés permiso"}
          >
            <CircleCheck aria-hidden />
            Confirmar
          </Button>
        )
      ) : null}
      {canReceive ? (
        <Button onClick={() => setDialog("receive")}>
          <PackageCheck aria-hidden />
          Recibir mercadería
        </Button>
      ) : null}
      {canCancel ? (
        <Button variant="outline" onClick={() => setDialog("cancel")}>
          <Ban aria-hidden />
          Cancelar orden
        </Button>
      ) : null}

      {canReceive ? (
        <ReceiveDialog
          open={dialog === "receive"}
          onOpenChange={(open) => setDialog(open ? "receive" : null)}
          purchase={purchase}
          lines={lines}
        />
      ) : null}
      {canCancel ? (
        <CancelPurchaseDialog
          open={dialog === "cancel"}
          onOpenChange={(open) => setDialog(open ? "cancel" : null)}
          purchaseId={purchase.id}
          code={purchase.code}
        />
      ) : null}
    </>
  );
}
