"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/features/auth/actions";
import { FormAlert } from "@/components/feedback/form-alert";
import { recoverSchema, type RecoverValues } from "@/features/auth/schemas";

export function RecoverForm() {
  const [result, setResult] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const { control, handleSubmit, formState } = useForm<RecoverValues>({
    resolver: zodResolver(recoverSchema),
    defaultValues: { email: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  async function onSubmit(values: RecoverValues) {
    setResult(null);
    const res = await requestPasswordReset(values);
    setResult(
      res.ok
        ? {
            tone: "success",
            message:
              "Si el email está registrado, te enviamos un enlace para elegir una nueva contraseña. Revisá tu correo, también la carpeta de spam.",
          }
        : { tone: "error", message: res.error },
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-5">
        {result ? <FormAlert tone={result.tone}>{result.message}</FormAlert> : null}
        <FormField
          control={control}
          name="email"
          label="Email de tu cuenta"
          render={(field, a11y) => (
            <Input {...field} {...a11y} type="email" autoComplete="email" autoFocus />
          )}
        />
        <Button type="submit" size="lg" className="w-full" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? <Loader2 aria-hidden className="animate-spin" /> : null}
          Enviar enlace
        </Button>
      </FieldGroup>
    </form>
  );
}
