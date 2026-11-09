import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Compras" };

export default function ComprasPage() {
  return (
    <ModulePlaceholder title="Compras" description="Órdenes de compra y recepción de mercadería." />
  );
}
