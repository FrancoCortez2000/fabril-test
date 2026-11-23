import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/data/page-header";
import { ItemsList, ItemsListSkeleton } from "@/features/items/components/items-list";

export const metadata: Metadata = { title: "Materias primas" };

export default function MateriasPrimasPage(props: PageProps<"/app/materias-primas">) {
  return (
    <>
      <PageHeader
        title="Materias primas"
        description="Lo que comprás para fabricar, con su stock y su costo promedio."
      />
      <Suspense fallback={<ItemsListSkeleton />}>
        <ItemsList kind="raw_material" searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
