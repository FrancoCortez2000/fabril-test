import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/data/page-header";
import {
  EmployeesView,
  EmployeesViewSkeleton,
} from "@/features/employees/components/employees-view";

export const metadata: Metadata = { title: "Empleados" };

export default function EmpleadosPage(props: PageProps<"/app/empleados">) {
  return (
    <>
      <PageHeader
        title="Empleados"
        description="Tu equipo y el costo por hora que se usa para costear la mano de obra."
      />
      <Suspense fallback={<EmployeesViewSkeleton />}>
        <EmployeesView searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
