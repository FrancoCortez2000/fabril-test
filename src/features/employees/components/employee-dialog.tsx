"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormAlert } from "@/components/feedback/form-alert";
import { FormField } from "@/components/forms/form-field";
import { MoneyInput } from "@/components/forms/number-input";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveEmployee } from "@/features/employees/actions";
import { employeeSchema, type EmployeeFormValues } from "@/features/employees/schemas";
import {
  EMPLOYEE_STATUS_LABELS,
  type AreaOption,
  type EmployeeRow,
  type EmployeeStatus,
} from "@/features/employees/types";

const NONE = "__none__";

const initial = (e: EmployeeRow | null): EmployeeFormValues => ({
  id: e?.id,
  firstName: e?.firstName ?? "",
  lastName: e?.lastName ?? "",
  position: e?.position ?? "",
  areaId: e?.areaId ?? null,
  hourlyCost: e?.hourlyCost ?? null,
  status: e?.status ?? "active",
});

/** Alta y edición de un empleado en un diálogo. En la demo se abre pero no guarda. */
export function EmployeeDialog({
  open,
  onOpenChange,
  employee,
  areas,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = alta. */
  employee: EmployeeRow | null;
  areas: AreaOption[];
}) {
  const router = useRouter();
  const { can } = useAccess();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: initial(employee),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { control, handleSubmit, formState } = form;

  useEffect(() => {
    if (open) {
      form.reset(initial(employee));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia el aviso al reabrir
      setServerError(null);
    }
  }, [open, employee, form]);

  async function onSubmit(values: EmployeeFormValues) {
    if (!can("manageEmployees")) return;
    setServerError(null);
    const result = await saveEmployee(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    toast.success(employee ? "Empleado actualizado" : "Empleado creado");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{employee ? "Editar empleado" : "Nuevo empleado"}</DialogTitle>
          <DialogDescription>
            Para dar de baja a alguien, pasalo a «Inactivo»: no se borra y conserva su historia.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup className="gap-5">
            {serverError ? <FormAlert>{serverError}</FormAlert> : null}
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={control}
                name="firstName"
                label="Nombre"
                render={(field, a11y) => <Input {...field} {...a11y} autoFocus />}
              />
              <FormField
                control={control}
                name="lastName"
                label="Apellido"
                render={(field, a11y) => <Input {...field} {...a11y} />}
              />
            </div>
            <FormField
              control={control}
              name="position"
              label="Cargo"
              optional
              render={(field, a11y) => (
                <Input {...field} {...a11y} placeholder="Operario de inyectora" />
              )}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={control}
                name="areaId"
                label="Área"
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
                      <SelectItem value={NONE}>Sin área</SelectItem>
                      {areas.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
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
                      {(Object.keys(EMPLOYEE_STATUS_LABELS) as EmployeeStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {EMPLOYEE_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <FormField
              control={control}
              name="hourlyCost"
              label="Costo por hora"
              optional
              description="Se usa para costear la mano de obra."
              render={(field, a11y) => (
                <MoneyInput
                  {...a11y}
                  name={field.name}
                  value={field.value ?? null}
                  onChange={(n) => field.onChange(n)}
                  onBlur={field.onBlur}
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
            <SubmitButton permission="manageEmployees" pending={formState.isSubmitting}>
              Guardar empleado
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
