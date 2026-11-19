import type { Metadata } from "next";

import { AuthCard } from "@/features/auth/components/auth-card";
import { ResetForm } from "@/features/auth/components/reset-form";

export const metadata: Metadata = { title: "Elegir contraseña" };

/** También la usan las personas invitadas para definir su primera contraseña. */
export default function RestablecerPage() {
  return (
    <AuthCard
      title="Elegí tu contraseña"
      description="La vas a usar para ingresar a FABRIL con tu email."
    >
      <ResetForm />
    </AuthCard>
  );
}
