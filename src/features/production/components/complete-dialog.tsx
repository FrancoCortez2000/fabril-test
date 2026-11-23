"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
import { completeOrder } from "@/features/production/actions";
import { completeOrderSchema, type CompleteOrderValues } from "@/features/production/schemas";
import type { OrderFull } from "@/features/production/types";

const initial = (order: OrderFull): CompleteOrderValues => ({
  id: order.id,
  good: order.goodQty > 0 ? order.goodQty : order.plannedQty,
  defective: order.defectiveQty,
  note: "",
});

/**
 * Completar la orden: cantidades finales buenas y defectuosas. Los ingresos a stock y el costo real
 * los calcula la base con lo que se consumió. En la demo se completa pero no guarda.
 */
export function CompleteDialog({
  open,
  onOpenChange,
  order,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderFull;
}) {
  const router = useRouter();
  const { can } = useAccess();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<CompleteOrderValues>({
    resolver: zodResolver(completeOrderSchema),
    defaultValues: initial(order),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { control, handleSubmit, formState } = form;

  useEffect(() => {
    if (open) {
      form.reset(initial(order));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia el aviso al reabrir
      setServerError(null);
    }
  }, [open, order, form]);

  async function onSubmit(values: CompleteOrderValues) {
    if (!can("manageProduction")) return;
    setServerError(null);
    const result = await completeOrder(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    toast.success(`Orden ${order.code} completada`);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Completar orden</DialogTitle>
          <DialogDescription>
            {order.code} · {order.itemName}. Confirmá cuántas unidades salieron buenas y cuántas
            defectuosas: entran al stock y se calcula el costo real.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup className="gap-5">
            {serverError ? <FormAlert>{serverError}</FormAlert> : null}
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={control}
                name="good"
                label="Unidades buenas finales"
                render={(field, a11y) => (
                  <NumberInput
                    {...a11y}
                    name={field.name}
                    value={field.value ?? null}
                    onChange={(n) => field.onChange(n as number)}
                    onBlur={field.onBlur}
                    unit={order.unitCode}
                  />
                )}
              />
              <FormField
                control={control}
                name="defective"
                label="Unidades defectuosas finales"
                render={(field, a11y) => (
                  <NumberInput
                    {...a11y}
                    name={field.name}
                    value={field.value ?? null}
                    onChange={(n) => field.onChange(n as number)}
                    onBlur={field.onBlur}
                    unit={order.unitCode}
                  />
                )}
              />
            </div>
            <FormField
              control={control}
              name="note"
              label="Nota"
              optional
              render={(field, a11y) => (
                <Textarea
                  {...field}
                  {...a11y}
                  rows={2}
                  placeholder="Control de calidad, observaciones…"
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
            <SubmitButton permission="manageProduction" pending={formState.isSubmitting}>
              Completar orden
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
