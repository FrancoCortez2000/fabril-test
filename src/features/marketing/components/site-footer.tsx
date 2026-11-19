import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { NAV_LINKS } from "@/features/marketing/content";

export function SiteFooter() {
  return (
    <footer>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs space-y-3">
          <Logo />
          <p className="text-13 text-muted-foreground">
            Gestión de producción, stock, recetas y compras para pequeñas y medianas fábricas.
          </p>
        </div>
        <nav aria-label="Pie de página" className="flex gap-12 text-sm">
          <ul className="space-y-2">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-muted-foreground hover:text-foreground">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <ul className="space-y-2">
            <li>
              <a href="#demo" className="text-muted-foreground hover:text-foreground">
                Solicitar demostración
              </a>
            </li>
            <li>
              <Link href="/ingresar" className="text-muted-foreground hover:text-foreground">
                Ingresar
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t">
        <p className="mx-auto w-full max-w-6xl px-4 py-5 text-xs text-muted-foreground sm:px-6">
          © 2026 FABRIL. Hecho en Argentina.
        </p>
      </div>
    </footer>
  );
}
