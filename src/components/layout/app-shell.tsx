import { AccessProvider } from "@/components/layout/access-provider";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DemoBanner } from "@/components/layout/demo-banner";
import { Topbar } from "@/components/layout/topbar";
import { getDashboard } from "@/features/dashboard/queries";
import type { DashboardAlert } from "@/features/dashboard/types";
import { requireSession } from "@/lib/auth/session";

/** Alertas de la campana. Si no se pueden cargar, la campana queda vacía y el panel sigue andando. */
async function loadAlerts(orgId: string): Promise<DashboardAlert[]> {
  try {
    return (await getDashboard(orgId)).alerts;
  } catch {
    return [];
  }
}

/**
 * Shell del panel con la sesión real o, sin cuenta, la de la demo pública (sólo lectura).
 * Sin sesión ni demo, o sin fábricas, `requireSession` redirige.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const alerts = await loadAlerts(session.activeOrganizationId);

  return (
    <AccessProvider role={session.role} mode={session.mode}>
      <div className="flex min-h-dvh w-full">
        <AppSidebar session={session} />
        <div className="flex min-w-0 flex-1 flex-col">
          {session.mode === "demo" ? <DemoBanner /> : null}
          <Topbar session={session} alerts={alerts} />
          <main
            id="contenido"
            className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 md:px-6 lg:px-8 lg:py-8"
          >
            {children}
          </main>
        </div>
      </div>
    </AccessProvider>
  );
}
