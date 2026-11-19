"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AUTH_PENDING_MESSAGE } from "@/features/auth/components/auth-card";
import { recoverSchema, type RecoverValues } from "@/features/auth/schemas";

export function RecoverForm() {
  const { control, handleSubmit, formState } = useForm<RecoverValues>({
    resolver: zodResolver(recoverSchema),
    defaultValues: { email: "" },
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
