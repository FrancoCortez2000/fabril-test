"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { FormAlert } from "@/components/feedback/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormField } from "@/components/forms/form-field";
import { MoneyInput, NumberInput } from "@/components/forms/number-input";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveItem } from "@/features/items/actions";
import { itemSchema, type ItemFormValues } from "@/features/items/schemas";
import { ITEM_LABELS, type ItemCategory, type ItemKind } from "@/features/items/types";
import { UNIT_CODES, UNIT_LABELS } from "@/features/products/schemas";

const NONE = "__none__";

export type ItemFormInitial = ItemFormValues & { id: string };

export function emptyItem(kind: ItemKind): ItemFormValues {
  return {
    kind,
    name: "",
    sku: "",
    description: "",
    categoryId: null,
    unitCode: kind === "raw_material" ? "kg" : "u",
    minStock: 0,
    status: "active",
    salePrice: null,
    standardLaborMinutes: 0,
    overheadPerUnit: 0,
    preferredSupplierId: null,
  };
}

/**
 * Alta y edición de un producto o de una materia prima. En la demo se abre y se completa, pero el
 * botón de guardar queda bloqueado (`SubmitButton`) y la base rechazaría la escritura igual.
 */
export function ItemFormDialog({
  open,
  onOpenChange,
  kind,
  categories,
  suppliers,
  initialValues,
  unitLocked = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: ItemKind;
  categories: ItemCategory[];
  suppliers: { id: string; name: string }[];
  /** Si viene, el formulario edita ese ítem. */
  initialValues?: ItemFormInitial;
  /** El ítem ya tiene movimientos: la unidad no se puede cambiar. */
  unitLocked?: boolean;
}) {
  const router = useRouter();
  const { can } = useAccess();
  const editing = Boolean(initialValues);
  const isProduct = kind === "finished_good";
  const labels = ITEM_LABELS[kind];
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: initialValues ?? emptyItem(kind),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  // Elemento que tenía el foco al abrir: ahí vuelve el foco al cerrar.
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      form.reset(initialValues ?? emptyItem(kind));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia el aviso al reabrir
      setServerError(null);
      const active = document.activeElement;
      returnFocusRef.current =
        active instanceof HTMLElement && active !== document.body ? active : null;
    }
  }, [open, initialValues, kind, form]);

  async function onSubmit(values: ItemFormValues) {
    if (!can("manageCatalog")) return;
    setServerError(null);
    const result = await saveItem(initialValues ? { ...values, id: initialValues.id } : values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    toast.success(`${editing ? "Cambios guardados" : "Se creó"}: ${values.sku} · ${values.name}`);
    onOpenChange(false);
    router.refresh();
  }

  const { control, handleSubmit, formState } = form;
  const unitCode = useWatch({ control, name: "unitCode" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          form.setFocus("name");
        }}
        onCloseAutoFocus={(e) => {
          const target = returnFocusRef.current;
          if (target?.isConnected) {
            e.preventDefault();
            target.focus();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{editing ? `Editar ${labels.singular}` : labels.newLabel}</DialogTitle>
          <DialogDescription>
            {isProduct
              ? "Productos terminados que fabrica tu planta. La receta y el stock se cargan después."
              : "Materias primas que comprás para fabricar. El stock entra con las compras y los ajustes."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup className="gap-5">
            {serverError ? <FormAlert>{serverError}</FormAlert> : null}

            <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
              <FormField
                control={control}
                name="name"
                label="Nombre"
                render={(field, a11y) => (
                  <Input
                    {...field}
                    {...a11y}
                    placeholder={isProduct ? "Bidón 5 L azul" : "Polietileno de alta densidad"}
                    autoComplete="off"
                  />
                )}
              />
              <FormField
                control={control}
                name="sku"
                label="SKU"
                description="Código interno único."
                render={(field, a11y) => (
                  <Input
                    {...field}
                    {...a11y}
                    placeholder={isProduct ? "BID-5L-AZ" : "PEAD-NAT"}
                    className="font-mono uppercase"
                    autoComplete="off"
                  />
                )}
              />
            </div>

            <FormField
              control={control}
              name="description"
              label="Descripción"
              optional
              render={(field, a11y) => (
                <Textarea
                  {...field}
                  {...a11y}
                  rows={2}
                  placeholder="Material, medidas o detalles para identificarlo"
                />
              )}
            />

            <div className="grid gap-5 sm:grid-cols-3">
              <FormField
                control={control}
                name="categoryId"
                label="Categoría"
                optional
                render={(field, a11y) => (
                  <Select
                    value={field.value ?? NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? null : v)}
                  >
                    <SelectTrigger {...a11y} className="w-full" onBlur={field.onBlur}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Sin categoría</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FormField
                control={control}
                name="unitCode"
                label="Unidad de medida"
                description={
                  unitLocked ? "Ya tiene movimientos: la unidad no se puede cambiar." : undefined
                }
                render={(field, a11y) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={unitLocked}>
                    <SelectTrigger {...a11y} className="w-full" onBlur={field.onBlur}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_CODES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {UNIT_LABELS[code]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FormField
                control={control}
                name="status"
                label="Estado"
                render={(field, a11y) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger {...a11y} className="w-full" onBlur={field.onBlur}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <FormField
                control={control}
                name="minStock"
                label="Stock mínimo"
                description="Debajo de este valor, aparece como stock bajo."
                render={(field, a11y) => (
                  <NumberInput
                    {...a11y}
                    name={field.name}
                    value={field.value}
                    onChange={(n) => field.onChange(n ?? 0)}
                    onBlur={field.onBlur}
                    unit={unitCode}
                  />
                )}
              />
              {isProduct ? (
                <>
                  <FormField
                    control={control}
                    name="salePrice"
                    label="Precio de venta"
                    optional
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
                  <FormField
                    control={control}
                    name="standardLaborMinutes"
                    label="Minutos de mano de obra"
                    description="Por unidad fabricada."
                    render={(field, a11y) => (
                      <NumberInput
                        {...a11y}
                        name={field.name}
                        value={field.value}
                        onChange={(n) => field.onChange(n ?? 0)}
                        onBlur={field.onBlur}
                        unit="min"
                      />
                    )}
                  />
                </>
              ) : (
                <FormField
                  control={control}
                  name="preferredSupplierId"
                  label="Proveedor preferido"
                  optional
                  render={(field, a11y) => (
                    <Select
                      value={field.value ?? NONE}
                      onValueChange={(v) => field.onChange(v === NONE ? null : v)}
                    >
                      <SelectTrigger {...a11y} className="w-full" onBlur={field.onBlur}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Sin proveedor preferido</SelectItem>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </div>

            {isProduct ? (
              <div className="grid gap-5 sm:grid-cols-3">
                <FormField
                  control={control}
                  name="overheadPerUnit"
                  label="Gastos indirectos"
                  description="Por unidad fabricada."
                  render={(field, a11y) => (
                    <MoneyInput
                      {...a11y}
                      name={field.name}
                      value={field.value}
                      onChange={(n) => field.onChange(n ?? 0)}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              </div>
            ) : null}
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
              {editing
                ? "Guardar cambios"
                : kind === "raw_material"
                  ? "Crear materia prima"
                  : "Crear producto"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
