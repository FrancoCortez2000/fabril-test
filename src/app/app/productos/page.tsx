import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Productos" };

export default function ProductosPage() {
  return (
    <ModulePlaceholder
      title="Productos"
      description="Productos terminados, sus recetas, stock y costos."
    />
  );
}
