"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { FormAlert } from "@/components/feedback/form-alert";
import { FormField } from "@/components/forms/form-field";
import { NumberInput } from "@/components/forms/number-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { useAccess } from "@/components/layout/access-provider";
import { Button } from "@/components/ui/button";
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
import type { BomView } from "@/features/items/bom-queries";
import { createOrder } from "@/features/production/actions";
import { MaterialsPreview } from "@/features/production/components/materials-preview";
import type { EmployeeOption, ProducibleItem } from "@/features/production/queries";
import { orderSchema, type OrderFormValues } from "@/features/production/schemas";
import { PRIORITY_LABELS } from "@/features/production/types";

const NONE = "__none__";

const EMPTY: OrderFormValues = {
  itemId: "",
  plannedQty: null as unknown as number,
  plannedStart: null,
  plannedEnd: null,
  priority: "normal",
  responsibleId: null,
  notes: "",
};

/**
 * Nueva orden de producción con vista previa de materiales en vivo. En la demo se completa y calcula,
 * pero planificar queda bloqueado. Un producto sin receta se explica y no se puede enviar.
 */
export function OrderForm({
  products,
  boms,
  employees,
}: {
  products: ProducibleItem[];
  boms: Record<string, BomView>;
  employees: EmployeeOption[];
}) {
  const router = useRouter();
  const { can } = useAccess();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: EMPTY,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { control, handleSubmit, formState } = form;
  const itemId = useWatch({ control, name: "itemId" });
  const plannedQty = useWatch({ control, name: "plannedQty" });
  const product = products.find((p) => p.id === itemId) ?? null;
  const bom = itemId ? (boms[itemId] ?? null) : null;

  async function onSubmit(values: OrderFormValues) {
    if (!can("manageProduction")) return;
    setServerError(null);
    const result = await createOrder(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    toast.success("Orden planificada");
    router.push(`/app/produccion/${result.data.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <FieldGroup className="gap-5">
          {serverError ? <FormAlert>{serverError}</FormAlert> : null}

          <FormField
            control={control}
            name="itemId"
            label="Producto"
            render={(field, a11y) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger {...a11y} className="w-full" onBlur={field.onBlur}>
                  <SelectValue placeholder="Elegí un producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.sku}){boms[p.id] ? "" : " — sin receta"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />

          <FormField
            control={control}
            name="plannedQty"
            label="Cantidad a fabricar"
            render={(field, a11y) => (
              <NumberInput
                {...a11y}
                name={field.name}
                value={field.value ?? null}
                onChange={(n) => field.onChange(n as number)}
                onBlur={field.onBlur}
                unit={product?.unitCode}
              />
            )}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={control}
              name="plannedStart"
              label="Inicio previsto"
              optional
              render={(field, a11y) => (
                <Input
                  {...a11y}
                  type="date"
                  name={field.name}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  onBlur={field.onBlur}
                />
              )}
            />
            <FormField
              control={control}
              name="plannedEnd"
              label="Fin previsto"
              optional
              render={(field, a11y) => (
                <Input
                  {...a11y}
                  type="date"
                  name={field.name}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  onBlur={field.onBlur}
                />
              )}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={control}
              name="priority"
              label="Prioridad"
              render={(field, a11y) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger {...a11y} className="w-full" onBlur={field.onBlur}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FormField
              control={control}
              name="responsibleId"
              label="Responsable"
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
                    <SelectItem value={NONE}>Sin responsable</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                        {e.position ? ` · ${e.position}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <FormField
            control={control}
            name="notes"
            label="Notas"
            optional
            render={(field, a11y) => (
              <Textarea {...field} {...a11y} rows={2} placeholder="Cliente, lote, aclaraciones…" />
            )}
          />
        </FieldGroup>

        <MaterialsPreview productId={itemId || null} bom={bom} plannedQty={plannedQty ?? null} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton
          permission="manageProduction"
          pending={formState.isSubmitting}
          disabled={!itemId || !bom}
        >
          Planificar orden
        </SubmitButton>
        <Button variant="outline" asChild>
          <Link href="/app/produccion">Cancelar</Link>
        </Button>
        {itemId && !bom ? (
          <p className="text-13 text-muted-foreground">
            Cargá la receta del producto para poder planificar la orden.
          </p>
        ) : null}
      </div>
    </form>
  );
}
