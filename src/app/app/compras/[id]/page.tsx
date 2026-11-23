import type { Metadata } from "next";
import { Suspense } from "react";

import { PurchaseView, PurchaseViewSkeleton } from "@/features/purchasing/components/purchase-view";

export const metadata: Metadata = { title: "Compra" };

async function Detail({ params }: { params: PageProps<"/app/compras/[id]">["params"] }) {
  const { id } = await params;
  return <PurchaseView id={id} />;
}

export default function CompraPage(props: PageProps<"/app/compras/[id]">) {
  return (
    <Suspense fallback={<PurchaseViewSkeleton />}>
      <Detail params={props.params} />
    </Suspense>
  );
}
