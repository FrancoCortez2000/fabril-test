import type { Metadata } from "next";
import { Suspense } from "react";

import { paginate, parseTableParams } from "@/components/data-table/params";
import { PageHeader } from "@/components/data/page-header";
import { SampleDataBadge } from "@/components/data/sample-data-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductsTable } from "@/features/products/components/products-table";
import {
  FIXTURE_CATEGORIES,
  PRODUCT_TABLE_OPTIONS,
  queryFixtureProducts,
} from "@/fixtures/products";

export const metadata: Metadata = { title: "Productos" };

async function ProductsSection({
  searchParams,
}: {
  searchParams: PageProps<"/app/productos">["searchParams"];
}) {
  const sp = await searchParams;
  const params = parseTableParams(sp, PRODUCT_TABLE_OPTIONS);
  const { rows, total } = paginate(queryFixtureProducts(params), params);

  return (
    <ProductsTable
      rows={rows}
      total={total}
      params={params}
      categories={FIXTURE_CATEGORIES}
      openNew={sp.nuevo === "1"}
    />
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-[440px] w-full rounded-lg" />
    </div>
  );
}

export default function ProductosPage(props: PageProps<"/app/productos">) {
  return (
    <>
      <PageHeader
        title="Productos"
        meta={<SampleDataBadge />}
        description="Productos terminados que fabrica tu planta, con su stock y costo estimado."
      />
      <Suspense fallback={<TableSkeleton />}>
        <ProductsSection searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
