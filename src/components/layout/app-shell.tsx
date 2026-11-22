import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireSession } from "@/lib/auth/session";

/** Shell del panel con la sesión real: sin sesión o sin fábricas, `requireSession` redirige. */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="flex min-h-dvh w-full">
      <AppSidebar session={session} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar session={session} />
        <main
          id="contenido"
          className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 md:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
