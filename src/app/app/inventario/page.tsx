import { History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ExportButton } from "@/components/data/export-button";
import { PageHeader } from "@/components/data/page-header";
import { Button } from "@/components/ui/button";
import { StockList, StockListSkeleton } from "@/features/inventory/components/stock-list";

export const metadata: Metadata = { title: "Inventario" };

export default function InventarioPage(props: PageProps<"/app/inventario">) {
  return (
    <>
      <PageHeader
        title="Inventario"
        description="Existencias, entradas, salidas y ajustes con trazabilidad completa."
        actions={
          <>
            <ExportButton href="/app/inventario/exportar" />
            <Button variant="outline" asChild>
              <Link href="/app/inventario/movimientos">
                <History aria-hidden />
                Ver movimientos
              </Link>
            </Button>
          </>
        }
      />
      <Suspense fallback={<StockListSkeleton />}>
        <StockList searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
