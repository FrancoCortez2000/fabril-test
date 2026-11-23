"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { FormAlert } from "@/components/feedback/form-alert";
import { NumberInput } from "@/components/forms/number-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { useAccess } from "@/components/layout/access-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { allowsDecimals } from "@/features/products/schemas";
import { receivePurchase } from "@/features/purchasing/actions";
import { todayInBuenosAires } from "@/features/purchasing/schemas";
import type { PurchaseLineDetail, PurchaseRow } from "@/features/purchasing/types";
import { formatQuantity } from "@/lib/format";

type Quantities = Record<string, number | null>;

const initialQuantities = (lines: PurchaseLineDetail[]): Quantities =>
  Object.fromEntries(lines.map((l) => [l.id, l.pendingQty > 0 ? l.pendingQty : 0]));

/**
 * Recepción de mercadería: cantidad recibida por línea (por defecto, lo pendiente), remito y fecha.
 * El stock y el costo promedio los actualiza la base. En la demo se abre pero no guarda.
 */
export function ReceiveDialog({
  open,
  onOpenChange,
  purchase,
  lines,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: PurchaseRow;
  lines: PurchaseLineDetail[];
}) {
  const router = useRouter();
  const { can } = useAccess();
  const [quantities, setQuantities] = useState<Quantities>(() => initialQuantities(lines));
  const [deliveryNote, setDeliveryNote] = useState("");
  const [receivedAt, setReceivedAt] = useState(todayInBuenosAires);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect -- se reinicia el formulario al abrir */
      setQuantities(initialQuantities(lines));
      setDeliveryNote("");
      setReceivedAt(todayInBuenosAires());
      setError(null);
      setPending(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, lines]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || !can("managePurchasing")) return;

    const chosen: { lineId: string; quantity: number }[] = [];
    for (const line of lines) {
      const quantity = quantities[line.id];
      if (quantity === null || quantity === undefined || Number.isNaN(quantity)) {
        if (quantity !== null && quantity !== undefined) {
          setError(`Ingresá la cantidad de ${line.itemName} como número`);
          return;
        }
        continue;
      }
      if (quantity < 0) {
        setError(`La cantidad de ${line.itemName} no puede ser negativa`);
        return;
      }
      if (quantity === 0) continue;
      if (quantity > line.pendingQty) {
        setError(`No podés recibir más de lo pendiente de ${line.itemName}`);
        return;
      }
      if (!allowsDecimals(line.unitCode) && !Number.isInteger(quantity)) {
        setError(`${line.itemName}: esta unidad no admite decimales`);
        return;
      }
      chosen.push({ lineId: line.id, quantity });
    }
    if (chosen.length === 0) {
      setError("Indicá la cantidad recibida de al menos un material");
      return;
    }

    setError(null);
    setPending(true);
    try {
      const result = await receivePurchase({
        id: purchase.id,
        deliveryNote,
        receivedAt,
        lines: chosen,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`Recepción registrada en ${purchase.code}`);
      onOpenChange(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Recibir mercadería</DialogTitle>
          <DialogDescription>
            {purchase.code} · {purchase.supplierName}. Indicá lo que llegó de cada material: se suma
            al stock y actualiza el costo promedio.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          {error ? <FormAlert>{error}</FormAlert> : null}

          <div className="space-y-3">
            {lines.map((line) => (
              <div
                key={line.id}
                className="grid items-center gap-3 rounded-md border p-3 sm:grid-cols-[1fr_11rem]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{line.itemName}</p>
                  <p className="text-xs text-muted-foreground">
                    Pedido: {formatQuantity(line.quantity, line.unitCode)} · Recibido:{" "}
                    {formatQuantity(line.receivedQty, line.unitCode)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pendiente: {formatQuantity(line.pendingQty, line.unitCode)}
                  </p>
                </div>
                <NumberInput
                  aria-label={`Cantidad recibida de ${line.itemName}`}
                  value={quantities[line.id] ?? null}
                  onChange={(n) => setQuantities((q) => ({ ...q, [line.id]: n }))}
                  unit={line.unitCode}
                  disabled={line.pendingQty <= 0}
                />
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="receive-note">Remito (opcional)</Label>
              <Input
                id="receive-note"
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder="0001-00004567"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="receive-date">Fecha de recepción</Label>
              <Input
                id="receive-date"
                type="date"
                value={receivedAt}
                max={todayInBuenosAires()}
                onChange={(e) => setReceivedAt(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <SubmitButton permission="managePurchasing" pending={pending}>
              Registrar recepción
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
