import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/data/page-header";
import {
  PurchasesList,
  PurchasesListSkeleton,
} from "@/features/purchasing/components/purchases-list";

export const metadata: Metadata = { title: "Compras" };

export default function ComprasPage(props: PageProps<"/app/compras">) {
  return (
    <>
      <PageHeader
        title="Compras"
        description="Órdenes de compra a proveedores: recibí la mercadería y el stock se actualiza solo."
      />
      <Suspense fallback={<PurchasesListSkeleton />}>
        <PurchasesList searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
