"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { Logo } from "@/components/layout/logo";
import { NavList } from "@/components/layout/nav-list";
import { OrgSwitcher } from "@/components/layout/org-switcher";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { AppSession } from "@/lib/auth/types";

export function MobileNav({ session }: { session: AppSession }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 gap-0 bg-sidebar p-0">
        <SheetHeader className="h-14 flex-row items-center border-b px-4">
          <SheetTitle asChild>
            <div>
              <Logo />
            </div>
          </SheetTitle>
          <SheetDescription className="sr-only">Navegación entre módulos</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-3">
          <NavList onNavigate={() => setOpen(false)} />
        </div>
        <div className="border-t p-3">
          <OrgSwitcher
            organizations={session.organizations}
            activeId={session.activeOrganizationId}
            readOnly={session.mode === "demo"}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
