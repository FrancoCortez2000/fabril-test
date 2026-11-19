import { SkipLink } from "@/components/layout/skip-link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/layout/logo";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="rounded-md" aria-label="FABRIL, inicio">
          <Logo />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Volver al sitio
        </Link>
      </header>
      <main
        id="contenido"
        className="flex flex-1 items-start justify-center px-4 pt-8 pb-16 sm:pt-16"
      >
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}
