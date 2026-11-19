import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Inventario" };

export default function InventarioPage() {
  return (
    <ModulePlaceholder
      title="Inventario"
      description="Existencias, entradas, salidas y ajustes con trazabilidad completa."
    />
  );
}
