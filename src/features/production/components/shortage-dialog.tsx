"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { FormAlert } from "@/components/feedback/form-alert";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPurchaseFromShortages } from "@/features/production/actions";
import { orderShortages } from "@/features/production/shortages";
import type { OrderFull, OrderMaterial } from "@/features/production/types";
import { formatQuantity } from "@/lib/format";

/**
 * Crea una compra borrador con los materiales que faltan para la orden. Hay que elegir proveedor. En
 * la demo se abre pero no guarda.
 */
export function ShortageDialog({
  open,
  onOpenChange,
  order,
  materials,
  suppliers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderFull;
  materials: OrderMaterial[];
  suppliers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { can } = useAccess();
  const [supplierId, setSupplierId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const shortages = orderShortages(materials);

  useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect -- se reinicia el formulario al abrir */
      setSupplierId("");
      setError(null);
      setPending(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || !can("manageProduction")) return;
    if (!supplierId) {
      setError("Elegí un proveedor para crear la compra");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = await createPurchaseFromShortages({ orderId: order.id, supplierId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Compra creada con los faltantes");
      onOpenChange(false);
      router.push(`/app/compras/${result.data.id}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear compra con faltantes</DialogTitle>
          <DialogDescription>
            {order.code} necesita más material del que hay. Se arma una compra con lo que falta y la
            podés confirmar desde su ficha.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          {error ? <FormAlert>{error}</FormAlert> : null}
          <ul className="divide-y rounded-md border">
            {shortages.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="text-sm font-medium">{m.itemName}</span>
                <span className="tabular text-13 text-status-delayed">
                  Falta {formatQuantity(m.shortage, m.unitCode)}
                </span>
              </li>
            ))}
          </ul>
          <div className="space-y-1.5">
            <Label htmlFor="shortage-supplier">Proveedor</Label>
            <Select value={supplierId || undefined} onValueChange={setSupplierId}>
              <SelectTrigger id="shortage-supplier" className="w-full">
                <SelectValue placeholder="Seleccioná uno" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <SubmitButton permission="manageProduction" pending={pending}>
              Crear compra
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
