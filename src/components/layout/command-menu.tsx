"use client";

import { Monitor, Moon, PackagePlus, Search, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { NAV_ITEMS } from "@/lib/navigation";

/**
 * Menú de comandos (Ctrl/⌘ + K): navegar entre módulos y acciones rápidas.
 * La búsqueda de registros (productos, órdenes, proveedores…) se agrega en la Etapa 4.
 */
export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-9 max-w-sm min-w-0 flex-1 justify-start gap-2 px-3 font-normal text-muted-foreground"
      >
        <Search aria-hidden />
        <span className="flex-1 text-left">Buscar…</span>
        <kbd className="hidden rounded border bg-surface-2 px-1.5 font-sans text-[11px] text-muted-foreground sm:inline">
          Ctrl K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Buscar en FABRIL"
        description="Ir a un módulo o ejecutar una acción"
      >
        <Command>
          <CommandInput placeholder="Escribí un módulo o una acción…" />
          <CommandList>
            <CommandEmpty>No hay coincidencias.</CommandEmpty>
            <CommandGroup heading="Acciones">
              <CommandItem onSelect={() => run(() => router.push("/app/productos?nuevo=1"))}>
                <PackagePlus aria-hidden />
                Nuevo producto
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Ir a">
              {NAV_ITEMS.map((item) => (
                <CommandItem key={item.href} onSelect={() => run(() => router.push(item.href))}>
                  <item.icon aria-hidden />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Tema">
              <CommandItem onSelect={() => run(() => setTheme("light"))}>
                <Sun aria-hidden />
                Tema claro
              </CommandItem>
              <CommandItem onSelect={() => run(() => setTheme("dark"))}>
                <Moon aria-hidden />
                Tema oscuro
              </CommandItem>
              <CommandItem onSelect={() => run(() => setTheme("system"))}>
                <Monitor aria-hidden />
                Tema del sistema
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
