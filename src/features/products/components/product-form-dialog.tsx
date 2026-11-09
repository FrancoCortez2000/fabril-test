"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { ImageInput } from "@/components/forms/image-input";
import { MoneyInput, NumberInput } from "@/components/forms/number-input";
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
import {
  UNIT_CODES,
  UNIT_LABELS,
  productSchema,
  type ProductFormValues,
} from "@/features/products/schemas";
import type { ProductCategory } from "@/fixtures/products";

const NO_CATEGORY = "__none__";

export const EMPTY_PRODUCT: ProductFormValues = {
  name: "",
  sku: "",
  description: "",
  categoryId: null,
  unitCode: "u",
  minStock: 0,
  salePrice: null,
  manualCost: null,
  status: "active",
};

export function ProductFormDialog({
  open,
  onOpenChange,
  categories,
  initialValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ProductCategory[];
  /** Si viene, el formulario edita ese producto. */
  initialValues?: ProductFormValues;
}) {
  const editing = Boolean(initialValues);
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: initialValues ?? EMPTY_PRODUCT,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    if (open) form.reset(initialValues ?? EMPTY_PRODUCT);
  }, [open, initialValues, form]);

  async function onSubmit(values: ProductFormValues) {
    // Etapa 2: los datos son válidos pero todavía no hay base de datos.
    // En la Etapa 4 esto llama a la Server Action que guarda el producto.
    await new Promise((r) => setTimeout(r, 400));
    toast.info("Vista previa: el guardado se habilita al conectar la base de datos (Etapa 3)", {
      description: `${values.sku} · ${values.name}`,
    });
    onOpenChange(false);
  }

  const { control, handleSubmit, formState } = form;
  const unitCode = useWatch({ control, name: "unitCode" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            Productos terminados que fabrica tu planta. La receta y el stock se cargan después.
          </DialogDescription>
        </DialogHeader>

        <form id="product-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup className="gap-5">
            <ImageInput onChange={() => {}} label="Imagen" />

            <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
              <FormField
                control={control}
                name="name"
                label="Nombre"
                render={(field, a11y) => (
                  <Input {...field} {...a11y} placeholder="Bidón 5 L azul" autoComplete="off" />
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
                    placeholder="BID-5L-AZ"
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
                    value={field.value ?? NO_CATEGORY}
                    onValueChange={(v) => field.onChange(v === NO_CATEGORY ? null : v)}
                  >
                    <SelectTrigger {...a11y} className="w-full" onBlur={field.onBlur}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY}>Sin categoría</SelectItem>
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
                render={(field, a11y) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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
              <FormField
                control={control}
                name="manualCost"
                label="Costo estimado"
                optional
                description="Se calcula solo cuando tenga receta."
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
            </div>
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={formState.isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" form="product-form" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {editing ? "Guardar cambios" : "Crear producto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
