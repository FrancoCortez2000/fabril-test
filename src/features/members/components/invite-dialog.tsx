"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormAlert } from "@/components/feedback/form-alert";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { inviteMember } from "@/features/members/actions";
import { InviteLink } from "@/features/members/components/invite-link";
import {
  inviteMemberSchema,
  type InviteMemberValues,
  type InviteResult,
} from "@/features/members/schemas";

const EMPTY: InviteMemberValues = { fullName: "", email: "" };

export function InviteDialog() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<(InviteResult & { name: string }) | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, formState, reset } = useForm<InviteMemberValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: EMPTY,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      reset(EMPTY);
      setResult(null);
      setServerError(null);
    }
  }

  async function onSubmit(values: InviteMemberValues) {
    setServerError(null);
    const res = await inviteMember(values);
    if (res.ok) setResult({ ...res.data, name: values.fullName });
    else setServerError(res.error);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus aria-hidden />
          Invitar usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invitar usuario</DialogTitle>
          <DialogDescription>
            La persona invitada va a tener acceso completo a esta fábrica, como administrador.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <>
            {result.inviteUrl ? (
              <InviteLink url={result.inviteUrl} name={result.name} />
            ) : (
              <FormAlert tone="success">
                {result.name} ya tenía una cuenta en FABRIL: ya puede entrar a esta fábrica con su
                contraseña.
              </FormAlert>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Listo
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup className="gap-5">
              {serverError ? <FormAlert>{serverError}</FormAlert> : null}
              <FormField
                control={control}
                name="fullName"
                label="Nombre y apellido"
                render={(field, a11y) => (
                  <Input {...field} {...a11y} autoComplete="off" autoFocus />
                )}
              />
              <FormField
                control={control}
                name="email"
                label="Email"
                render={(field, a11y) => (
                  <Input {...field} {...a11y} type="email" autoComplete="off" />
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={formState.isSubmitting}>
                  {formState.isSubmitting ? <Loader2 aria-hidden className="animate-spin" /> : null}
                  Generar invitación
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
