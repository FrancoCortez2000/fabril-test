import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/data/page-header";
import { StockList, StockListSkeleton } from "@/features/inventory/components/stock-list";

export const metadata: Metadata = { title: "Inventario" };

export default function InventarioPage(props: PageProps<"/app/inventario">) {
  return (
    <>
      <PageHeader
        title="Inventario"
        description="Existencias, entradas, salidas y ajustes con trazabilidad completa."
      />
      <Suspense fallback={<StockListSkeleton />}>
        <StockList searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
