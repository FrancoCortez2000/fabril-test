"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormAlert } from "@/components/feedback/form-alert";
import { FormField } from "@/components/forms/form-field";
import { MoneyInput, NumberInput } from "@/components/forms/number-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { useAccess } from "@/components/layout/access-provider";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { saveGeneralSettings } from "@/features/settings/actions";
import { generalSettingsSchema, type GeneralSettingsValues } from "@/features/settings/schemas";

const COMMON_ZONES = [
  "America/Argentina/Buenos_Aires",
  "America/Argentina/Cordoba",
  "America/Argentina/Mendoza",
  "America/Argentina/Salta",
  "America/Argentina/Ushuaia",
  "America/Montevideo",
  "America/Santiago",
  "America/Asuncion",
  "America/Sao_Paulo",
];

/** Datos generales de la fábrica: identificación, zona horaria y valores por defecto de costos y stock. */
export function GeneralForm({ initialValues }: { initialValues: GeneralSettingsValues }) {
  const router = useRouter();
  const { can } = useAccess();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<GeneralSettingsValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: initialValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { control, handleSubmit, formState } = form;

  // En el navegador se ofrecen todas las zonas; el servidor (y la base) validan igual.
  const zones = useMemo(() => {
    try {
      const all = (
        Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
      ).supportedValuesOf?.("timeZone");
      return all?.length ? all : COMMON_ZONES;
    } catch {
      return COMMON_ZONES;
    }
  }, []);

  async function onSubmit(values: GeneralSettingsValues) {
    if (!can("manageSettings")) return;
    setServerError(null);
    const result = await saveGeneralSettings(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    toast.success("Datos de la fábrica guardados");
    form.reset(values);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-3xl space-y-6">
      <FieldGroup className="gap-5">
        {serverError ? <FormAlert>{serverError}</FormAlert> : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={control}
            name="name"
            label="Nombre"
            render={(field, a11y) => <Input {...field} {...a11y} autoComplete="organization" />}
          />
          <FormField
            control={control}
            name="legalName"
            label="Razón social"
            optional
            render={(field, a11y) => <Input {...field} {...a11y} />}
          />
          <FormField
            control={control}
            name="cuit"
            label="CUIT"
            optional
            description="Formato 30-12345678-9."
            render={(field, a11y) => (
              <Input {...field} {...a11y} inputMode="numeric" placeholder="30-12345678-9" />
            )}
          />
          <FormField
            control={control}
            name="phone"
            label="Teléfono"
            optional
            render={(field, a11y) => <Input {...field} {...a11y} type="tel" autoComplete="tel" />}
          />
          <FormField
            control={control}
            name="email"
            label="Email"
            optional
            render={(field, a11y) => (
              <Input {...field} {...a11y} type="email" autoComplete="email" />
            )}
          />
          <FormField
            control={control}
            name="address"
            label="Dirección"
            optional
            render={(field, a11y) => <Input {...field} {...a11y} autoComplete="street-address" />}
          />
          <FormField
            control={control}
            name="city"
            label="Ciudad"
            optional
            render={(field, a11y) => <Input {...field} {...a11y} />}
          />
          <FormField
            control={control}
            name="province"
            label="Provincia"
            optional
            render={(field, a11y) => <Input {...field} {...a11y} />}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <FormField
            control={control}
            name="timezone"
            label="Zona horaria"
            description="Define cuándo empieza y termina cada día."
            render={(field, a11y) => (
              <>
                <Input {...field} {...a11y} list="fabril-timezones" autoComplete="off" />
                <datalist id="fabril-timezones">
                  {zones.map((z) => (
                    <option key={z} value={z} />
                  ))}
                </datalist>
              </>
            )}
          />
          <FormField
            control={control}
            name="defaultWastePct"
            label="Desperdicio por defecto"
            description="Se usa en las recetas que no indican uno."
            render={(field, a11y) => (
              <NumberInput
                {...a11y}
                name={field.name}
                value={field.value}
                onChange={(n) => field.onChange(n as number)}
                onBlur={field.onBlur}
                unit="%"
              />
            )}
          />
          <FormField
            control={control}
            name="defaultLaborRate"
            label="Costo hora por defecto"
            description="Mano de obra, para el costo estándar."
            render={(field, a11y) => (
              <MoneyInput
                {...a11y}
                name={field.name}
                value={field.value}
                onChange={(n) => field.onChange(n as number)}
                onBlur={field.onBlur}
              />
            )}
          />
        </div>

        <FormField
          control={control}
          name="allowNegativeStock"
          label="Permitir stock negativo"
          description="Deja registrar salidas aunque no alcance el stock. No se recomienda."
          render={(field, a11y) => (
            <Checkbox
              id={a11y.id}
              aria-describedby={a11y["aria-describedby"]}
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              onBlur={field.onBlur}
            />
          )}
        />
      </FieldGroup>

      <SubmitButton permission="manageSettings" pending={formState.isSubmitting}>
        Guardar cambios
      </SubmitButton>
    </form>
  );
}
