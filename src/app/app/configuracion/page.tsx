import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/data/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MembersPanel } from "@/features/members/components/members-panel";
import { listMembers } from "@/features/members/queries";
import { DemoReset } from "@/features/settings/components/demo-reset";
import { GeneralForm } from "@/features/settings/components/general-form";
import { getOrganizationSettings } from "@/features/settings/queries";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Configuración" };

async function Settings() {
  const session = await requireSession();
  // La demo pública es de solo lectura y no tiene configuración.
  if (session.mode === "demo") redirect("/app");

  const [settings, members] = await Promise.all([
    getOrganizationSettings(session.activeOrganizationId),
    listMembers(session),
  ]);
  if (!settings) notFound();

  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
      </TabsList>
      <TabsContent value="general" className="space-y-8 pt-4">
        <GeneralForm initialValues={settings.values} />
        {settings.isDemo ? <DemoReset /> : null}
      </TabsContent>
      <TabsContent value="usuarios" className="pt-4">
        <MembersPanel members={members} isDemo={settings.isDemo} />
      </TabsContent>
    </Tabs>
  );
}

export default function ConfiguracionPage() {
  return (
    <>
      <PageHeader
        title="Configuración"
        description="Datos de tu fábrica, valores por defecto y quiénes pueden usarla."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <Settings />
      </Suspense>
    </>
  );
}
