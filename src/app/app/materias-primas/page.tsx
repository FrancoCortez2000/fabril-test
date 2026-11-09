import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Materias primas" };

export default function MateriasPrimasPage() {
  return (
    <ModulePlaceholder
      title="Materias primas"
      description="Insumos y materiales que se usan en las recetas."
    />
  );
}
