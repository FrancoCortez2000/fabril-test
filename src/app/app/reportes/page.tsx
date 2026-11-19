import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Reportes" };

export default function ReportesPage() {
  return (
    <ModulePlaceholder
      title="Reportes"
      description="Producción, consumo, desperdicio, compras y rendimiento por período."
    />
  );
}
