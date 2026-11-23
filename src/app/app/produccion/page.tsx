import type { Metadata } from "next";
import { Suspense } from "react";

import { ClipboardPlus } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/data/page-header";
import { Button } from "@/components/ui/button";
import { OrdersList, OrdersListSkeleton } from "@/features/production/components/orders-list";

export const metadata: Metadata = { title: "Producción" };

export default function ProduccionPage(props: PageProps<"/app/produccion">) {
  return (
    <>
      <PageHeader
        title="Producción"
        description="Órdenes de producción: avance, materiales, personal y costo planificado contra el real."
        actions={
          <Button asChild>
            <Link href="/app/produccion/nueva">
              <ClipboardPlus aria-hidden />
              Nueva orden
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<OrdersListSkeleton />}>
        <OrdersList searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
