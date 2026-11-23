"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormAlert } from "@/components/feedback/form-alert";
import { FormField } from "@/components/forms/form-field";
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
import { cancelPurchase } from "@/features/purchasing/actions";
import { cancelPurchaseSchema, type CancelPurchaseValues } from "@/features/purchasing/schemas";

/** Cancela una orden de compra. El motivo es obligatorio. En la demo se abre pero no guarda. */
export function CancelPurchaseDialog({
  open,
  onOpenChange,
  purchaseId,
  code,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseId: string;
  code: string;
}) {
  const router = useRouter();
  const { can } = useAccess();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<CancelPurchaseValues>({
    resolver: zodResolver(cancelPurchaseSchema),
    defaultValues: { id: purchaseId, reason: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { control, handleSubmit, formState } = form;

  useEffect(() => {
    if (open) {
      form.reset({ id: purchaseId, reason: "" });
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia el aviso al reabrir
      setServerError(null);
    }
  }, [open, purchaseId, form]);

  async function onSubmit(values: CancelPurchaseValues) {
    if (!can("managePurchasing")) return;
    setServerError(null);
    const result = await cancelPurchase(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    toast.success(`Orden ${code} cancelada`);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cancelar orden {code}</DialogTitle>
          <DialogDescription>
            La orden queda cancelada y ya no se puede recibir. Lo que se haya recibido hasta ahora
            se conserva en el stock.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup className="gap-5">
            {serverError ? <FormAlert>{serverError}</FormAlert> : null}
            <FormField
              control={control}
              name="reason"
              label="Motivo"
              render={(field, a11y) => (
                <Textarea
                  {...field}
                  {...a11y}
                  rows={2}
                  placeholder="Cambio de proveedor, error de pedido…"
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
              Volver
            </Button>
            <SubmitButton permission="managePurchasing" pending={formState.isSubmitting}>
              Cancelar la orden
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
