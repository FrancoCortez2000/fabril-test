import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Producción" };

export default function ProduccionPage() {
  return (
    <ModulePlaceholder
      title="Producción"
      description="Órdenes de producción, avance, materiales y personal asignado."
    />
  );
}
