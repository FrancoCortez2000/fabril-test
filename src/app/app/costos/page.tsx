import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Costos" };

export default function CostosPage() {
  return (
    <ModulePlaceholder
      title="Costos"
      description="Costo estándar por producto y planificado contra real por orden."
    />
  );
}
