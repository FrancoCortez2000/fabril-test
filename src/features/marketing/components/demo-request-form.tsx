"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormAlert } from "@/components/feedback/form-alert";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitDemoRequest } from "@/features/marketing/actions";
import { demoRequestSchema, type DemoRequestValues } from "@/features/marketing/schemas";

const EMPTY: DemoRequestValues = {
  name: "",
  company: "",
  email: "",
  phone: "",
  industry: "",
  message: "",
  website: "",
};

export function DemoRequestForm() {
  const [sent, setSent] = useState<{ name: string; email: string } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<DemoRequestValues>({
    resolver: zodResolver(demoRequestSchema),
    defaultValues: EMPTY,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { control, handleSubmit, formState, register } = form;

  async function onSubmit(values: DemoRequestValues) {
    setServerError(null);
    const res = await submitDemoRequest(values);
    if (res.ok) setSent({ name: values.name.split(" ")[0] ?? values.name, email: values.email });
    else setServerError(res.error);
  }

  if (sent) {
    return (
      <div className="rounded-xl border bg-surface p-5 sm:p-6">
        <FormAlert tone="success">
          <p className="font-medium">Gracias, {sent.name}. Recibimos tu solicitud.</p>
          <p className="mt-1 text-muted-foreground">
            Te vamos a escribir a {sent.email} para coordinar una demostración con datos de tu rubro.
          </p>
        </FormAlert>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="rounded-xl border bg-surface p-5 sm:p-6"
    >
      <FieldGroup className="gap-5">
        {serverError ? <FormAlert>{serverError}</FormAlert> : null}
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={control}
            name="name"
            label="Nombre y apellido"
            render={(field, a11y) => <Input {...field} {...a11y} autoComplete="name" />}
          />
          <FormField
            control={control}
            name="company"
            label="Empresa"
            render={(field, a11y) => <Input {...field} {...a11y} autoComplete="organization" />}
          />
          <FormField
            control={control}
            name="email"
            label="Email"
            render={(field, a11y) => (
              <Input {...field} {...a11y} type="email" autoComplete="email" />
            )}
          />
          <FormField
            control={control}
            name="phone"
            label="Teléfono"
            optional
            render={(field, a11y) => <Input {...field} {...a11y} type="tel" autoComplete="tel" />}
          />
        </div>
        <FormField
          control={control}
          name="industry"
          label="¿Qué fabrican?"
          optional
          render={(field, a11y) => (
            <Input {...field} {...a11y} placeholder="Envases plásticos, alimentos, química…" />
          )}
        />
        <FormField
          control={control}
          name="message"
          label="Contanos tu situación"
          optional
          render={(field, a11y) => (
            <Textarea
              {...field}
              {...a11y}
              rows={3}
              placeholder="Cuántos productos manejan, cómo controlan hoy el stock…"
            />
          )}
        />
        {/* Campo trampa anti-spam: oculto para personas y lectores de pantalla. */}
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Sitio web
            <input type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
          </label>
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={formState.isSubmitting}
          className="w-full sm:w-auto"
        >
          {formState.isSubmitting ? <Loader2 aria-hidden className="animate-spin" /> : null}
          Solicitar demostración
        </Button>
      </FieldGroup>
    </form>
  );
}
