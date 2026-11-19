import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/data/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { MembersPanel } from "@/features/members/components/members-panel";
import { listMembers } from "@/features/members/queries";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Configuración" };

async function Members() {
  const session = await requireSession();
  const members = await listMembers(session);
  const isDemo = session.organizations.find((o) => o.id === session.activeOrganizationId)?.isDemo ?? false;
  return <MembersPanel members={members} isDemo={isDemo} />;
}

export default function ConfiguracionPage() {
  return (
    <>
      <PageHeader
        title="Configuración"
        description="Usuarios de la fábrica. Los datos de la fábrica, las categorías y las áreas se suman en la Etapa 4."
      />
      <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
        <Members />
      </Suspense>
    </>
  );
}
