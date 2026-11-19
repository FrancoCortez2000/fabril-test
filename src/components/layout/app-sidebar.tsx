"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Logo } from "@/components/layout/logo";
import { NavList } from "@/components/layout/nav-list";
import { OrgSwitcher } from "@/components/layout/org-switcher";
import { Button } from "@/components/ui/button";
import type { AppSession } from "@/fixtures/session";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "fabril:sidebar-collapsed";

export function AppSidebar({ session }: { session: AppSession }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      // Preferencia por navegador: se lee al montar para no romper la hidratación.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* almacenamiento no disponible: queda expandida */
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* sin almacenamiento: sólo vale para esta visita */
      }
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200 lg:flex",
        collapsed ? "w-16" : "w-62",
      )}
    >
      <div className={cn("flex h-14 items-center gap-2 px-4", collapsed && "justify-center px-0")}>
        <Link href="/app" className="rounded-md" aria-label="FABRIL, ir al inicio">
          <Logo collapsed={collapsed} />
        </Link>
      </div>
      <div className={cn("flex-1 overflow-y-auto px-3 py-3", collapsed && "px-2")}>
        <NavList collapsed={collapsed} />
      </div>
      <div className={cn("space-y-1 border-t p-3", collapsed && "p-2")}>
        <OrgSwitcher
          organizations={session.organizations}
          activeId={session.activeOrganizationId}
          collapsed={collapsed}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          className={cn(
            "w-full justify-start text-muted-foreground",
            collapsed && "justify-center",
          )}
          aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
        >
          {collapsed ? <PanelLeftOpen aria-hidden /> : <PanelLeftClose aria-hidden />}
          {collapsed ? null : "Contraer"}
        </Button>
      </div>
    </aside>
  );
}
