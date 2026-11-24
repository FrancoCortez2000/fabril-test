import {
  Boxes,
  Calculator,
  Factory,
  House,
  Package,
  Settings,
  Users,
  ShoppingCart,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import type { SessionMode } from "@/lib/auth/types";

export type NavGroup = "inicio" | "operacion" | "sistema";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  group: NavGroup;
};

/** Título visible de cada grupo; `null` = sin título. */
export const NAV_GROUPS: Record<NavGroup, string | null> = {
  inicio: null,
  operacion: "Operación",
  sistema: "Sistema",
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Inicio", href: "/app", icon: House, group: "inicio" },
  { label: "Producción", href: "/app/produccion", icon: Factory, group: "operacion" },
  { label: "Inventario", href: "/app/inventario", icon: Warehouse, group: "operacion" },
  { label: "Productos", href: "/app/productos", icon: Package, group: "operacion" },
  { label: "Materias primas", href: "/app/materias-primas", icon: Boxes, group: "operacion" },
  { label: "Compras", href: "/app/compras", icon: ShoppingCart, group: "operacion" },
  { label: "Costos", href: "/app/costos", icon: Calculator, group: "operacion" },
  { label: "Empleados", href: "/app/empleados", icon: Users, group: "operacion" },
  { label: "Configuración", href: "/app/configuracion", icon: Settings, group: "sistema" },
];

/** Ítems del menú según el modo: en la demo no existe Configuración. */
export function navItemsFor(mode: SessionMode): NavItem[] {
  return mode === "demo" ? NAV_ITEMS.filter((i) => i.href !== "/app/configuracion") : NAV_ITEMS;
}

/** `/app` sólo se activa en su ruta exacta; el resto, por segmento. */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Ítems agrupados en el orden de aparición. */
export function groupedNavItems(
  mode: SessionMode = "member",
): { group: NavGroup; title: string | null; items: NavItem[] }[] {
  const groups: { group: NavGroup; title: string | null; items: NavItem[] }[] = [];
  for (const item of navItemsFor(mode)) {
    let entry = groups.find((g) => g.group === item.group);
    if (!entry) {
      entry = { group: item.group, title: NAV_GROUPS[item.group], items: [] };
      groups.push(entry);
    }
    entry.items.push(item);
  }
  return groups;
}
