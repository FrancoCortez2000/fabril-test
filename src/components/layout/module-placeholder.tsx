import { Construction } from "lucide-react";

import { PageHeader } from "@/components/data/page-header";
import { EmptyState } from "@/components/feedback/empty-state";

/** Página provisoria para los módulos que se construyen en la Etapa 4. */
export function ModulePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={Construction}
        title="Este módulo se construye en la Etapa 4"
        description="La estructura y la navegación ya están listas. Las pantallas se arman directamente sobre la base de datos real."
      />
    </>
  );
}
