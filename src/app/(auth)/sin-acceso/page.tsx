import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { AuthCard } from "@/features/auth/components/auth-card";

export const metadata: Metadata = { title: "Sin acceso" };

/** Usuario con sesión pero sin ninguna fábrica activa (por ejemplo, lo deshabilitaron). */
export default function SinAccesoPage() {
  return (
    <AuthCard
      title="Sin acceso"
      description="Tu usuario no tiene acceso activo a ninguna fábrica. Pedile al administrador de tu fábrica que te habilite o que te invite de nuevo."
    >
      <form action={signOut}>
        <Button type="submit" variant="outline" size="lg" className="w-full">
          Cerrar sesión
        </Button>
      </form>
    </AuthCard>
  );
}
