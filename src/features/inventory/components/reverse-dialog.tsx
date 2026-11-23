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
import { reverseMovement } from "@/features/inventory/actions";
import { signedQuantity } from "@/features/inventory/format";
import { reverseSchema, type ReverseFormValues } from "@/features/inventory/schemas";
import { MOVEMENT_TYPE_LABELS, type MovementRow } from "@/features/inventory/types";

/**
 * Revierte un movimiento manual o un ajuste: la base registra el movimiento inverso (el original no
 * se modifica ni se borra). El motivo es obligatorio. En la demo se abre pero confirmar queda bloqueado.
 */
export function ReverseDialog({
  open,
  onOpenChange,
  movement,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movement: MovementRow;
}) {
  const router = useRouter();
  const { can } = useAccess();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<ReverseFormValues>({
    resolver: zodResolver(reverseSchema),
    defaultValues: { movementId: movement.id, reason: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { control, handleSubmit, formState } = form;

  useEffect(() => {
    if (open) {
      form.reset({ movementId: movement.id, reason: "" });
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia el aviso al reabrir
      setServerError(null);
    }
  }, [open, movement.id, form]);

  async function onSubmit(values: ReverseFormValues) {
    if (!can("manageInventory")) return;
    setServerError(null);
    const result = await reverseMovement(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    toast.success(`Movimiento revertido: ${movement.itemName}`);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Revertir movimiento</DialogTitle>
          <DialogDescription>
            {`${MOVEMENT_TYPE_LABELS[movement.type] ?? movement.type} · ${signedQuantity(movement.quantity, movement.unitCode)} · ${movement.itemName}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup className="gap-5">
            {serverError ? <FormAlert>{serverError}</FormAlert> : null}
            <p className="text-13 text-muted-foreground">
              Se registra un movimiento inverso para dejar el stock como estaba. El original queda
              en el historial marcado como revertido.
            </p>
            <FormField
              control={control}
              name="reason"
              label="Motivo"
              render={(field, a11y) => (
                <Textarea
                  {...field}
                  {...a11y}
                  rows={2}
                  placeholder="Error de carga, conteo equivocado…"
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
              Revertir
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
