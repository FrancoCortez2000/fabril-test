"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { groupedNavItems, isNavItemActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const GROUPS = groupedNavItems();

/** Lista de navegación compartida por la barra lateral y el menú móvil. */
export function NavList({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Módulos" className="flex flex-col gap-5">
      {GROUPS.map(({ group, title, items }) => (
        <div key={group} className="flex flex-col gap-0.5">
          {title && !collapsed ? (
            <p className="px-3 pb-1 text-xs text-muted-foreground">{title}</p>
          ) : null}
          {title && collapsed ? <div className="mx-3 mb-1 border-t" aria-hidden /> : null}
          <ul className="flex flex-col gap-0.5">
            {items.map((item) => {
              const active = isNavItemActive(pathname, item.href);
              const Icon = item.icon;
              const link = (
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-9 items-center gap-3 rounded-md px-3 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    active && "bg-sidebar-accent font-medium text-sidebar-foreground",
                    collapsed && "justify-center px-0",
                  )}
                >
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-full bg-brand"
                    />
                  ) : null}
                  <Icon aria-hidden className="size-4 shrink-0" />
                  {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
                </Link>
              );
              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
