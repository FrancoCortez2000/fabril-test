"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { updatePassword } from "@/features/auth/actions";
import { FormAlert } from "@/features/auth/components/form-alert";
import { PasswordInput } from "@/features/auth/components/password-input";
import { resetPasswordSchema, type ResetPasswordValues } from "@/features/auth/schemas";

export function ResetForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirm: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  async function onSubmit(values: ResetPasswordValues) {
    setServerError(null);
    // Si se guarda, la acción redirige al panel.
    const res = await updatePassword(values);
    if (res && !res.ok) setServerError(res.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-5">
        {serverError ? <FormAlert>{serverError}</FormAlert> : null}
        <FormField
          control={control}
          name="password"
          label="Nueva contraseña"
          description="Al menos 8 caracteres, con letras y números."
          render={(field, a11y) => (
            <PasswordInput {...field} {...a11y} autoComplete="new-password" autoFocus />
          )}
        />
        <FormField
          control={control}
          name="confirm"
          label="Repetí la contraseña"
          render={(field, a11y) => (
            <PasswordInput {...field} {...a11y} autoComplete="new-password" />
          )}
        />
        <Button type="submit" size="lg" className="w-full" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? <Loader2 aria-hidden className="animate-spin" /> : null}
          Guardar contraseña
        </Button>
      </FieldGroup>
    </form>
  );
}
