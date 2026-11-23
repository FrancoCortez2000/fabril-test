"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormAlert } from "@/components/feedback/form-alert";
import { FormField } from "@/components/forms/form-field";
import { MoneyInput, NumberInput } from "@/components/forms/number-input";
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
import { registerMovement } from "@/features/inventory/actions";
import type { StockRow } from "@/features/inventory/queries";
import { movementSchema, type MovementFormValues } from "@/features/inventory/schemas";
import { formatQuantity } from "@/lib/format";

/**
 * Entrada o salida manual de un ítem. En la demo se abre y se completa, pero registrar queda
 * bloqueado. El motivo es obligatorio: queda en el libro de movimientos.
 */
export function MovementDialog({
  open,
  onOpenChange,
  item,
  type,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: StockRow;
  type: "manual_in" | "manual_out";
}) {
  const router = useRouter();
  const { can } = useAccess();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEntry = type === "manual_in";

  const empty = (): MovementFormValues => ({
    itemId: item.itemId,
    type,
    quantity: null as unknown as number,
    unitCost: null,
    reason: "",
  });

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: empty(),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { control, handleSubmit, formState } = form;

  useEffect(() => {
    if (open) {
      form.reset({
        itemId: item.itemId,
        type,
        quantity: null as unknown as number,
        unitCost: null,
        reason: "",
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia el aviso al reabrir
      setServerError(null);
    }
  }, [open, item.itemId, type, form]);

  async function onSubmit(values: MovementFormValues) {
    if (!can("manageInventory")) return;
    setServerError(null);
    const result = await registerMovement(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    toast.success(
      `${isEntry ? "Entrada" : "Salida"} registrada: ${formatQuantity(values.quantity, item.unitCode)} de ${item.name}`,
    );
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEntry ? "Entrada manual" : "Salida manual"}</DialogTitle>
          <DialogDescription>
            {item.name} · {item.sku}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup className="gap-5">
            {serverError ? <FormAlert>{serverError}</FormAlert> : null}
            <p className="text-13 text-muted-foreground">
              Stock: {formatQuantity(item.physical, item.unitCode)} · Disponible:{" "}
              {formatQuantity(item.available, item.unitCode)}
            </p>
            <div className={isEntry ? "grid gap-5 sm:grid-cols-2" : undefined}>
              <FormField
                control={control}
                name="quantity"
                label="Cantidad"
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
              {isEntry ? (
                <FormField
                  control={control}
                  name="unitCost"
                  label="Costo unitario"
                  optional
                  description="Si lo dejás vacío, se usa el costo promedio."
                  render={(field, a11y) => (
                    <MoneyInput
                      {...a11y}
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              ) : null}
            </div>
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
                  placeholder={
                    isEntry
                      ? "Conteo físico, devolución, donación…"
                      : "Rotura, muestra, consumo interno…"
                  }
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
              {isEntry ? "Registrar entrada" : "Registrar salida"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
