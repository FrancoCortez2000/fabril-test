"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SessionOrganization } from "@/lib/auth/types";
import { switchOrganization } from "@/features/organizations/actions";
import { cn } from "@/lib/utils";

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded-sm border border-brand/60 bg-brand/15 px-1.5 py-px text-[11px] font-medium text-foreground",
        className,
      )}
    >
      Demo
    </span>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-ZÁÉÍÓÚÑ]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

export function OrgSwitcher({
  organizations,
  activeId,
  collapsed = false,
}: {
  organizations: SessionOrganization[];
  activeId: string;
  collapsed?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const active = organizations.find((o) => o.id === activeId) ?? organizations[0];
  if (!active) return null;

  function choose(id: string) {
    if (id === active?.id) return;
    startTransition(async () => {
      const result = await switchOrganization({ organizationId: id });
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md p-2 text-left hover:bg-sidebar-accent",
          collapsed && "justify-center",
          pending && "opacity-60",
        )}
        aria-busy={pending}
        aria-label={`Fábrica activa: ${active.name}. Cambiar de fábrica`}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-surface text-xs font-semibold">
          {initials(active.name)}
        </span>
        {collapsed ? null : (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{active.name}</span>
              {active.isDemo ? <DemoBadge className="mt-0.5 inline-block" /> : null}
            </span>
            <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Tus fábricas
        </DropdownMenuLabel>
        {organizations.map((org) => (
          <DropdownMenuItem key={org.id} className="gap-2" onSelect={() => choose(org.id)}>
            <span className="flex-1 truncate">{org.name}</span>
            {org.isDemo ? <DemoBadge /> : null}
            {org.id === active.id ? <Check aria-hidden className="size-4" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
