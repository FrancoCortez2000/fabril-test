"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { FormAlert } from "@/components/feedback/form-alert";
import { FormField } from "@/components/forms/form-field";
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
import { FieldGroup } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { registerAdjustment } from "@/features/inventory/actions";
import type { StockRow } from "@/features/inventory/queries";
import { adjustmentSchema, type AdjustmentFormValues } from "@/features/inventory/schemas";
import { formatQuantity } from "@/lib/format";

/**
 * Ajuste por conteo físico: se carga lo que hay realmente y la base registra la diferencia. En la
 * demo se abre y se completa, pero registrar queda bloqueado.
 */
export function AdjustmentDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: StockRow;
}) {
  const router = useRouter();
  const { can } = useAccess();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { itemId: item.itemId, countedQty: null as unknown as number, reason: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { control, handleSubmit, formState } = form;
  const counted = useWatch({ control, name: "countedQty" });
  const difference =
    typeof counted === "number" && Number.isFinite(counted) ? counted - item.physical : null;

  useEffect(() => {
    if (open) {
      form.reset({ itemId: item.itemId, countedQty: null as unknown as number, reason: "" });
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia el aviso al reabrir
      setServerError(null);
    }
  }, [open, item.itemId, form]);

  async function onSubmit(values: AdjustmentFormValues) {
    if (!can("manageInventory")) return;
    setServerError(null);
    const result = await registerAdjustment(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    toast.success(
      `Ajuste registrado: ${item.name} queda en ${formatQuantity(values.countedQty, item.unitCode)}`,
    );
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajuste por conteo</DialogTitle>
          <DialogDescription>
            {item.name} · {item.sku}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup className="gap-5">
            {serverError ? <FormAlert>{serverError}</FormAlert> : null}
            <p className="text-13 text-muted-foreground">
              Stock en el sistema: {formatQuantity(item.physical, item.unitCode)}
            </p>
            <FormField
              control={control}
              name="countedQty"
              label="Cantidad contada"
              description={
                difference === null
                  ? "Lo que hay físicamente. El sistema registra la diferencia."
                  : `Diferencia: ${difference > 0 ? "+" : ""}${formatQuantity(difference, item.unitCode)}`
              }
              render={(field, a11y) => (
                <NumberInput
                  {...a11y}
                  name={field.name}
                  value={field.value ?? null}
                  onChange={(n) => field.onChange(n as number)}
                  onBlur={field.onBlur}
                  unit={item.unitCode}
                  autoFocus
                />
              )}
            />
            <FormField
              control={control}
              name="reason"
              label="Motivo"
              description="Queda registrado en el historial de movimientos."
              render={(field, a11y) => (
                <Textarea
                  {...field}
                  {...a11y}
                  rows={2}
                  placeholder="Conteo de fin de mes, inventario general…"
                />
              )}
            />
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={formState.isSubmitting}
            >
              Cancelar
            </Button>
            <SubmitButton permission="manageInventory" pending={formState.isSubmitting}>
              Registrar ajuste
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
