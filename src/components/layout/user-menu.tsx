"use client";

import { LogOut } from "lucide-react";
import { useTheme } from "next-themes";

import { THEME_OPTIONS } from "@/components/layout/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AppSession } from "@/fixtures/session";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu({ user }: { user: AppSession["user"] }) {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full" aria-label={`Cuenta de ${user.name}`}>
        <Avatar className="size-8 border">
          <AvatarFallback className="bg-surface-2 text-xs font-semibold">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Tema
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon aria-hidden className="size-4" />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <Tooltip>
          <TooltipTrigger asChild>
            {/* span: un elemento deshabilitado no recibe el hover del tooltip */}
            <span className="block">
              <DropdownMenuItem disabled>
                <LogOut aria-hidden />
                Cerrar sesión
              </DropdownMenuItem>
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">Disponible al conectar la autenticación</TooltipContent>
        </Tooltip>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
