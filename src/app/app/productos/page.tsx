import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/data/page-header";
import { ItemsList, ItemsListSkeleton } from "@/features/items/components/items-list";

export const metadata: Metadata = { title: "Productos" };

export default function ProductosPage(props: PageProps<"/app/productos">) {
  return (
    <>
      <PageHeader
        title="Productos"
        description="Productos terminados que fabrica tu planta, con su stock y su costo estándar."
      />
      <Suspense fallback={<ItemsListSkeleton />}>
        <ItemsList kind="finished_good" searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
