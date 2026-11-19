import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/features/marketing/content";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="FABRIL, inicio" className="rounded-md">
          <Logo />
        </Link>
        <nav aria-label="Secciones" className="hidden flex-1 md:block">
          <ul className="flex items-center gap-6 text-sm text-muted-foreground">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="hover:text-foreground">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/ingresar">Ingresar</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <a href="#demo">Solicitar demostración</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
