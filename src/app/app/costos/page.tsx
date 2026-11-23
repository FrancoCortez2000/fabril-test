import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/data/page-header";
import { CostsView, CostsViewSkeleton } from "@/features/costs/components/costs-view";

export const metadata: Metadata = { title: "Costos" };

export default function CostosPage() {
  return (
    <>
      <PageHeader
        title="Costos"
        description="Cuánto cuesta fabricar cada producto y dónde se desvía el costo real."
      />
      <Suspense fallback={<CostsViewSkeleton />}>
        <CostsView />
      </Suspense>
    </>
  );
}
