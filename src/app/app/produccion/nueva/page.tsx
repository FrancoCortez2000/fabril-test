import type { Metadata } from "next";
import { Suspense } from "react";

import { NewOrder, NewOrderSkeleton } from "@/features/production/components/new-order";

export const metadata: Metadata = { title: "Nueva orden de producción" };

export default function NuevaOrdenPage() {
  return (
    <Suspense fallback={<NewOrderSkeleton />}>
      <NewOrder />
    </Suspense>
  );
}
