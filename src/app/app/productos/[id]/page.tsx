import type { Metadata } from "next";
import { Suspense } from "react";

import { ItemDetail, ItemDetailSkeleton } from "@/features/items/components/item-detail";

export const metadata: Metadata = { title: "Producto" };

async function Detail({ params }: { params: PageProps<"/app/productos/[id]">["params"] }) {
  const { id } = await params;
  return <ItemDetail kind="finished_good" id={id} />;
}

export default function ProductoPage(props: PageProps<"/app/productos/[id]">) {
  return (
    <Suspense fallback={<ItemDetailSkeleton />}>
      <Detail params={props.params} />
    </Suspense>
  );
}
