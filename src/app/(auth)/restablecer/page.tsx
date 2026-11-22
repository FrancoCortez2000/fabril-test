import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ResetForm } from "@/features/auth/components/reset-form";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Elegir contraseña" };

/** Llega desde el enlace de recuperación o de invitación (ambos dejan una sesión iniciada). */
async function ResetGate() {
  const session = await getSession();

  if (!session) {
    return (
      <AuthCard
        title="El enlace venció"
        description="El enlace para elegir contraseña ya se usó o pasó su tiempo de validez."
      >
        <Button asChild size="lg" className="w-full">
          <Link href="/recuperar">Pedir un enlace nuevo</Link>
        </Button>
      </AuthCard>
    );
  }

  const factory = session.organizations.find((o) => !o.isDemo) ?? session.organizations[0];
  return (
    <AuthCard
      title="Elegí tu contraseña"
      description={
        factory
          ? `La vas a usar para ingresar a ${factory.name} con ${session.user.email}.`
          : `La vas a usar para ingresar a FABRIL con ${session.user.email}.`
      }
    >
      <ResetForm />
    </AuthCard>
  );
}

export default function RestablecerPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[360px] w-full rounded-xl" />}>
      <ResetGate />
    </Suspense>
  );
}
