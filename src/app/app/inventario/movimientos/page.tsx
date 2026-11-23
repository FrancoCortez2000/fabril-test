import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/data/page-header";
import {
  MovementsList,
  MovementsListSkeleton,
} from "@/features/inventory/components/movements-list";

export const metadata: Metadata = { title: "Movimientos de stock" };

export default function MovimientosPage(props: PageProps<"/app/inventario/movimientos">) {
  return (
    <>
      <PageHeader
        title="Movimientos de stock"
        breadcrumbs={[{ label: "Inventario", href: "/app/inventario" }, { label: "Movimientos" }]}
        description="Cada entrada, salida y ajuste con su fecha, motivo y documento de origen. El historial no se borra: un error se corrige con una reversión."
      />
      <Suspense fallback={<MovementsListSkeleton />}>
        <MovementsList searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
