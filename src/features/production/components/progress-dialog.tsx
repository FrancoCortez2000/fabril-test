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
import { reportProgress } from "@/features/production/actions";
import { reportProgressSchema, type ReportProgressValues } from "@/features/production/schemas";
import type { OrderFull } from "@/features/production/types";

const empty = (id: string): ReportProgressValues => ({
  id,
  good: null as unknown as number,
  defective: null as unknown as number,
  notes: "",
});

/** Parte de avance de una orden en producción. En la demo se completa pero no guarda. */
export function ProgressDialog({
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
  const form = useForm<ReportProgressValues>({
    // Un campo sin completar cuenta como cero (los dos arrancan vacíos).
    resolver: (values, context, options) =>
      zodResolver(reportProgressSchema)(
        { ...values, good: values.good ?? 0, defective: values.defective ?? 0 },
        context,
        options,
      ),
    defaultValues: empty(order.id),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { control, handleSubmit, formState } = form;

  useEffect(() => {
    if (open) {
      form.reset(empty(order.id));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia el aviso al reabrir
      setServerError(null);
    }
  }, [open, order.id, form]);

  async function onSubmit(values: ReportProgressValues) {
    if (!can("manageProduction")) return;
    setServerError(null);
    const result = await reportProgress(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    toast.success(`Parte de avance registrado en ${order.code}`);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar avance</DialogTitle>
          <DialogDescription>
            {order.code} · {order.itemName}. Cargá lo producido desde el último parte.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup className="gap-5">
            {serverError ? <FormAlert>{serverError}</FormAlert> : null}
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={control}
                name="good"
                label="Unidades buenas"
                render={(field, a11y) => (
                  <NumberInput
                    {...a11y}
                    name={field.name}
                    value={field.value ?? null}
                    onChange={(n) => field.onChange(n ?? 0)}
                    onBlur={field.onBlur}
                    unit={order.unitCode}
                    autoFocus
                  />
                )}
              />
              <FormField
                control={control}
                name="defective"
                label="Unidades defectuosas"
                render={(field, a11y) => (
                  <NumberInput
                    {...a11y}
                    name={field.name}
                    value={field.value ?? null}
                    onChange={(n) => field.onChange(n ?? 0)}
                    onBlur={field.onBlur}
                    unit={order.unitCode}
                  />
                )}
              />
            </div>
            <FormField
              control={control}
              name="notes"
              label="Notas"
              optional
              render={(field, a11y) => (
                <Textarea {...field} {...a11y} rows={2} placeholder="Turno, máquina, novedades…" />
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
              Registrar avance
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
