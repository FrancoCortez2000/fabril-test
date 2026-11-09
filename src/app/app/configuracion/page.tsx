import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Configuración" };

export default function ConfiguracionPage() {
  return (
    <ModulePlaceholder
      title="Configuración"
      description="Datos de la fábrica, usuarios, categorías y áreas."
    />
  );
}
