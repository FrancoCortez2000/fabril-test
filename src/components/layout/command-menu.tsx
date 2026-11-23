"use client";

import {
  Boxes,
  ClipboardList,
  Monitor,
  Moon,
  Package,
  PackagePlus,
  Search,
  ShoppingCart,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { useAccess } from "@/components/layout/access-provider";

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
import type { SearchHit } from "@/features/search/queries";
import { navItemsFor } from "@/lib/navigation";

const GROUPS: { kind: SearchHit["kind"]; heading: string; icon: LucideIcon }[] = [
  { kind: "product", heading: "Productos", icon: Package },
  { kind: "raw_material", heading: "Materias primas", icon: Boxes },
  { kind: "order", heading: "Órdenes", icon: ClipboardList },
  { kind: "purchase", heading: "Compras", icon: ShoppingCart },
];
const MIN_TERM = 2;

/**
 * Menú de comandos (Ctrl/⌘ + K): navegar entre módulos y acciones rápidas.
 * Con 2 o más letras también busca productos, materias primas, órdenes y compras.
 */
export function CommandMenu() {
  const { mode } = useAccess();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);

  // Búsqueda de registros con espera corta y descarte de respuestas viejas.
  useEffect(() => {
    const q = term.trim();
    if (q.length < MIN_TERM) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sin término no hay resultados
      setHits([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/app/buscar?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const body = (await res.json()) as { hits?: SearchHit[] };
        if (!controller.signal.aborted) setHits(body.hits ?? []);
      } catch {
        /* sin red o cancelada: el menú sigue con módulos y acciones */
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

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
          <CommandInput
            placeholder="Escribí un módulo o una acción…"
            value={term}
            onValueChange={setTerm}
          />
          <CommandList>
            <CommandEmpty>No hay coincidencias.</CommandEmpty>
            {GROUPS.map(({ kind, heading, icon: Icon }) => {
              const group = hits.filter((h) => h.kind === kind);
              if (group.length === 0) return null;
              return (
                <CommandGroup key={kind} heading={heading} forceMount>
                  {group.map((h) => (
                    <CommandItem
                      key={`${kind}-${h.id}`}
                      value={`${kind}-${h.id}`}
                      forceMount
                      onSelect={() => run(() => router.push(h.href))}
                    >
                      <Icon aria-hidden />
                      <span className="flex-1 truncate">{h.title}</span>
                      <span className="text-xs text-muted-foreground">{h.detail}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
            <CommandGroup heading="Acciones">
              <CommandItem onSelect={() => run(() => router.push("/app/productos?nuevo=1"))}>
                <PackagePlus aria-hidden />
                Nuevo producto
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Ir a">
              {navItemsFor(mode).map((item) => (
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
