import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/data/page-header";
import { OrdersList, OrdersListSkeleton } from "@/features/production/components/orders-list";

export const metadata: Metadata = { title: "Producción" };

export default function ProduccionPage(props: PageProps<"/app/produccion">) {
  return (
    <>
      <PageHeader
        title="Producción"
        description="Órdenes de producción: avance, materiales, personal y costo planificado contra el real."
      />
      <Suspense fallback={<OrdersListSkeleton />}>
        <OrdersList searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
