import type { Metadata } from "next";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { FIXTURE_SESSION } from "@/fixtures/session";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · FABRIL" },
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: LayoutProps<"/app">) {
  // Etapa 2: sesión de ejemplo. En la Etapa 3 se obtiene de Supabase y se exige autenticación.
  const session = FIXTURE_SESSION;

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
