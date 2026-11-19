"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn } from "@/features/auth/actions";
import { FormAlert } from "@/components/feedback/form-alert";
import { PasswordInput } from "@/features/auth/components/password-input";
import { loginSchema, type LoginValues } from "@/features/auth/schemas";

const LINK_ERROR =
  "El enlace venció o ya se usó. Pedí uno nuevo desde “¿Olvidaste tu contraseña?”.";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? undefined;
  const [serverError, setServerError] = useState<string | null>(
    searchParams.get("error") === "enlace" ? LINK_ERROR : null,
  );
  const { control, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    // Si las credenciales son correctas, la acción redirige al panel.
    const result = await signIn({ ...values, next });
    if (result && !result.ok) setServerError(result.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-5">
        {serverError ? <FormAlert>{serverError}</FormAlert> : null}
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
