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

/** Minúsculas y sin tildes, para comparar lo escrito con las etiquetas. */
const normalize = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

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

  type Entry = { label: string; icon: LucideIcon; run: () => void };
  const entries: { heading: string; items: Entry[] }[] = [
    {
      heading: "Acciones",
      items: [
        {
          label: "Nuevo producto",
          icon: PackagePlus,
          run: () => router.push("/app/productos?nuevo=1"),
        },
      ],
    },
    {
      heading: "Ir a",
      items: navItemsFor(mode).map((item) => ({
        label: item.label,
        icon: item.icon,
        run: () => router.push(item.href),
      })),
    },
    {
      heading: "Tema",
      items: [
        { label: "Tema claro", icon: Sun, run: () => setTheme("light") },
        { label: "Tema oscuro", icon: Moon, run: () => setTheme("dark") },
        { label: "Tema del sistema", icon: Monitor, run: () => setTheme("system") },
      ],
    },
  ];
  // Sin filtrado automático de cmdk: módulos y acciones se filtran acá (sin tildes ni mayúsculas) y
  // los registros llegan ya filtrados del servidor.
  const needle = normalize(term);
  const groups = entries
    .map((g) => ({ ...g, items: g.items.filter((i) => normalize(i.label).includes(needle)) }))
    .filter((g) => g.items.length > 0);

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
        <Command shouldFilter={false}>
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
                <CommandGroup key={kind} heading={heading}>
                  {group.map((h) => (
                    <CommandItem
                      key={`${kind}-${h.id}`}
                      value={`${kind}-${h.id}`}
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
            {groups.map(({ heading, items }) => (
              <CommandGroup key={heading} heading={heading}>
                {items.map(({ label, icon: Icon, run: action }) => (
                  <CommandItem key={label} value={label} onSelect={() => run(action)}>
                    <Icon aria-hidden />
                    {label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
