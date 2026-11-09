"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AUTH_PENDING_MESSAGE } from "@/features/auth/components/auth-card";
import { PasswordInput } from "@/features/auth/components/password-input";
import { loginSchema, type LoginValues } from "@/features/auth/schemas";

export function LoginForm() {
  const { control, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  async function onSubmit() {
    await new Promise((r) => setTimeout(r, 400));
    toast.info(AUTH_PENDING_MESSAGE, {
      description: "Mientras tanto podés recorrer el panel con datos de ejemplo en /app.",
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-5">
        <FormField
          control={control}
          name="email"
          label="Email"
          render={(field, a11y) => (
            <Input {...field} {...a11y} type="email" autoComplete="email" autoFocus />
          )}
        />
        <FormField
          control={control}
          name="password"
          label="Contraseña"
          render={(field, a11y) => (
            <PasswordInput {...field} {...a11y} autoComplete="current-password" />
          )}
        />
        <div className="-mt-2 text-right">
          <Link
            href="/recuperar"
            className="text-13 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? <Loader2 aria-hidden className="animate-spin" /> : null}
          Ingresar
        </Button>
      </FieldGroup>
    </form>
  );
}
