"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveBom } from "@/features/items/bom-actions";
import type { RawMaterialOption } from "@/features/items/bom-queries";
import { bomSchema, type BomFormValues } from "@/features/items/bom-schemas";

const EMPTY: BomFormValues = { outputQty: 1, defaultWastePct: null, notes: "", lines: [] };

/**
 * Alta y edición de la receta de un producto: rendimiento, desperdicio por defecto y las líneas de
 * materia prima. En la demo se abre y se edita, pero guardar queda bloqueado.
 */
export function BomEditorDialog({
  open,
  onOpenChange,
  itemId,
  initialValues,
  materials,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  /** Receta actual; `null` si el producto todavía no tiene. */
  initialValues: BomFormValues | null;
  materials: RawMaterialOption[];
}) {
  const router = useRouter();
  const { can } = useAccess();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<BomFormValues>({
    resolver: zodResolver(bomSchema),
    defaultValues: initialValues ?? EMPTY,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { control, handleSubmit, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const lines = useWatch({ control, name: "lines" });

  useEffect(() => {
    if (open) {
      form.reset(initialValues ?? EMPTY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia el aviso al reabrir
      setServerError(null);
    }
  }, [open, initialValues, form]);

  async function onSubmit(values: BomFormValues) {
    if (!can("manageCatalog")) return;
    setServerError(null);
    const result = await saveBom({ itemId, ...values });
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    toast.success("Receta guardada");
    onOpenChange(false);
    router.refresh();
  }

  const chosen = new Set((lines ?? []).map((l) => l.componentItemId));
  const linesError = formState.errors.lines?.message ?? formState.errors.lines?.root?.message;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{initialValues ? "Editar receta" : "Crear receta"}</DialogTitle>
          <DialogDescription>
            Lo que lleva fabricar el rendimiento indicado. Las cantidades se calculan por unidad de
            producto al planificar una orden.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup className="gap-5">
            {serverError ? <FormAlert>{serverError}</FormAlert> : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={control}
                name="outputQty"
                label="Rendimiento"
                description="Unidades de producto que salen con estas cantidades."
                render={(field, a11y) => (
                  <NumberInput
                    {...a11y}
                    name={field.name}
                    value={field.value}
                    onChange={(n) => field.onChange(n ?? 0)}
                    onBlur={field.onBlur}
                  />
                )}
              />
              <FormField
                control={control}
                name="defaultWastePct"
                label="Desperdicio por defecto"
                optional
                description="Si lo dejás vacío, se usa el de la fábrica."
                render={(field, a11y) => (
                  <NumberInput
                    {...a11y}
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    unit="%"
                  />
                )}
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Materias primas</h3>
              {fields.map((field, index) => {
                const current = lines?.[index]?.componentItemId;
                const options = materials.filter((m) => m.id === current || !chosen.has(m.id));
                const unit = materials.find((m) => m.id === current)?.unitCode;
                return (
                  <div
                    key={field.id}
                    className="grid items-start gap-3 rounded-md border p-3 sm:grid-cols-[1fr_9rem_8rem_auto]"
                  >
                    <FormField
                      control={control}
                      name={`lines.${index}.componentItemId`}
                      label={`Materia prima ${index + 1}`}
                      render={(f, a11y) => (
                        <Select value={f.value || undefined} onValueChange={f.onChange}>
                          <SelectTrigger {...a11y} className="w-full" onBlur={f.onBlur}>
                            <SelectValue placeholder="Elegí una materia prima" />
                          </SelectTrigger>
                          <SelectContent>
                            {options.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`lines.${index}.quantity`}
                      label={`Cantidad de la línea ${index + 1}`}
                      render={(f, a11y) => (
                        <NumberInput
                          {...a11y}
                          name={f.name}
                          value={f.value}
                          onChange={(n) => f.onChange(n ?? 0)}
                          onBlur={f.onBlur}
                          unit={unit}
                        />
                      )}
                    />
                    <FormField
                      control={control}
                      name={`lines.${index}.wastePct`}
                      label={`Desperdicio de la línea ${index + 1}`}
                      optional
                      render={(f, a11y) => (
                        <NumberInput
                          {...a11y}
                          name={f.name}
                          value={f.value}
                          onChange={f.onChange}
                          onBlur={f.onBlur}
                          unit="%"
                        />
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-6"
                      aria-label={`Quitar la línea ${index + 1}`}
                      onClick={() => remove(index)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                );
              })}
              {linesError ? (
                <p role="alert" className="text-13 text-destructive">
                  {linesError}
                </p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ componentItemId: "", quantity: 1, wastePct: null })}
              >
                <Plus aria-hidden />
                Agregar materia prima
              </Button>
            </div>

            <FormField
              control={control}
              name="notes"
              label="Notas"
              optional
              render={(field, a11y) => (
                <Textarea
                  {...field}
                  {...a11y}
                  rows={2}
                  placeholder="Versión, aclaraciones del proceso…"
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
            <SubmitButton permission="manageCatalog" pending={formState.isSubmitting}>
              Guardar receta
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
