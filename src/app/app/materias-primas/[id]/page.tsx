import type { Metadata } from "next";
import { Suspense } from "react";

import { ItemDetail, ItemDetailSkeleton } from "@/features/items/components/item-detail";

export const metadata: Metadata = { title: "Materia prima" };

async function Detail({ params }: { params: PageProps<"/app/materias-primas/[id]">["params"] }) {
  const { id } = await params;
  return <ItemDetail kind="raw_material" id={id} />;
}

export default function MateriaPrimaPage(props: PageProps<"/app/materias-primas/[id]">) {
  return (
    <Suspense fallback={<ItemDetailSkeleton />}>
      <Detail params={props.params} />
    </Suspense>
  );
}
