import type { Metadata } from "next";
import { Suspense } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { ShellSkeleton } from "@/components/layout/shell-skeleton";
import { SkipLink } from "@/components/layout/skip-link";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · FABRIL" },
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: LayoutProps<"/app">) {
  // La sesión se lee en el request: con Cache Components va detrás de un límite de Suspense.
  return (
    <>
      <SkipLink />
      <Suspense fallback={<ShellSkeleton />}>
        <AppShell>{children}</AppShell>
      </Suspense>
    </>
  );
}
