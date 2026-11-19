import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Empleados" };

export default function EmpleadosPage() {
  return (
    <ModulePlaceholder
      title="Empleados"
      description="Personal de la fábrica y su participación en la producción."
    />
  );
}
