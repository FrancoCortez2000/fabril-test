import type { Metadata } from "next";
import { Suspense } from "react";

import { OrderView, OrderViewSkeleton } from "@/features/production/components/order-view";

export const metadata: Metadata = { title: "Orden de producción" };

async function Detail({ params }: { params: PageProps<"/app/produccion/[id]">["params"] }) {
  const { id } = await params;
  return <OrderView id={id} />;
}

export default function OrdenPage(props: PageProps<"/app/produccion/[id]">) {
  return (
    <Suspense fallback={<OrderViewSkeleton />}>
      <Detail params={props.params} />
    </Suspense>
  );
}
