import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Inicio" };

export default function AppHomePage() {
  return (
    <ModulePlaceholder
      title="Inicio"
      description="Resumen de la producción, el stock y las compras de tu fábrica."
    />
  );
}
