import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Proveedores" };

export default function ProveedoresPage() {
  return (
    <ModulePlaceholder
      title="Proveedores"
      description="Datos de contacto e historial de compras de cada proveedor."
    />
  );
}
