import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/features/auth/components/auth-card";
import { RecoverForm } from "@/features/auth/components/recover-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <AuthCard
      title="Recuperar contraseña"
      description="Te enviamos un enlace para que elijas una contraseña nueva."
      footer={
        <Link href="/ingresar" className="font-medium text-foreground underline underline-offset-4">
          Volver a ingresar
        </Link>
      }
    >
      <RecoverForm />
    </AuthCard>
  );
}
