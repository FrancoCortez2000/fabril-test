"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const form = useForm<DemoRequestValues>({
    resolver: zodResolver(demoRequestSchema),
    defaultValues: EMPTY,
    mode: "onTouched",
  });
  const { control, handleSubmit, formState, register } = form;

  async function onSubmit() {
    // Etapa 2: el formulario valida, pero el envío se conecta a la base en la Etapa 3.
    await new Promise((r) => setTimeout(r, 400));
    toast.info("El envío se habilita al conectar la base de datos", {
      description: "Tus datos son válidos; en la Etapa 3 la solicitud queda guardada.",
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="rounded-xl border bg-surface p-5 sm:p-6"
    >
      <FieldGroup className="gap-5">
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
