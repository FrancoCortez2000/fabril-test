import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Ingresar" };

export default function IngresarPage() {
  return (
    <AuthCard
      title="Ingresar"
      description="Entrá al panel de tu fábrica."
      footer={
        <>
          ¿No tenés cuenta?{" "}
          <Link href="/#demo" className="font-medium text-foreground underline underline-offset-4">
            Solicitá una demostración
          </Link>
        </>
      }
    >
      {/* El formulario lee ?next= y ?error= de la URL. */}
      <Suspense fallback={<div className="h-[264px]" aria-hidden />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
