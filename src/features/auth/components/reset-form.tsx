"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { AUTH_PENDING_MESSAGE } from "@/features/auth/components/auth-card";
import { PasswordInput } from "@/features/auth/components/password-input";
import { resetPasswordSchema, type ResetPasswordValues } from "@/features/auth/schemas";

export function ResetForm() {
  const { control, handleSubmit, formState } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirm: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  async function onSubmit() {
    await new Promise((r) => setTimeout(r, 400));
    toast.info(AUTH_PENDING_MESSAGE);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-5">
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
