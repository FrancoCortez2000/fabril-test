import type { Metadata } from "next";
import { Suspense } from "react";

import { ExportButton } from "@/components/data/export-button";
import { PageHeader } from "@/components/data/page-header";
import { CostsView, CostsViewSkeleton } from "@/features/costs/components/costs-view";

export const metadata: Metadata = { title: "Costos" };

export default function CostosPage() {
  return (
    <>
      <PageHeader
        title="Costos"
        description="Cuánto cuesta fabricar cada producto y dónde se desvía el costo real."
        actions={<ExportButton href="/app/costos/exportar" />}
      />
      <Suspense fallback={<CostsViewSkeleton />}>
        <CostsView />
      </Suspense>
    </>
  );
}
