"use client";

import { Loader2 } from "lucide-react";
import type * as React from "react";

import { useAccess } from "@/components/layout/access-provider";
import { Button } from "@/components/ui/button";
import type { Permission } from "@/lib/auth/permissions";

type SubmitButtonProps = Omit<React.ComponentProps<typeof Button>, "asChild"> & {
  /** Permiso que exige la acción; sin él el botón queda deshabilitado. */
  permission: Permission;
  pending?: boolean;
};

/**
 * Botón final de un formulario. En la demo el formulario se puede abrir y completar, pero el botón
 * queda deshabilitado y lo explica ("No disponible en la demo"). La base rechaza igual cualquier escritura.
 */
export function SubmitButton({
  permission,
  pending = false,
  disabled,
  children,
  type = "submit",
  ...props
}: SubmitButtonProps) {
  const { can, mode } = useAccess();
  const allowed = can(permission);
  const inDemo = mode === "demo" && !allowed;

  return (
    <Button
      {...props}
      type={type}
      disabled={disabled || pending || !allowed}
      aria-busy={pending || undefined}
      title={inDemo ? "La demo es de solo lectura: los cambios no se guardan" : props.title}
    >
      {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
      {inDemo ? "No disponible en la demo" : children}
    </Button>
  );
}
