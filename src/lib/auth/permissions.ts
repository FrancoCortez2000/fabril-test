import type { AppRole } from "@/lib/auth/types";

/**
 * Matriz de permisos de la app. En v1 hay un único rol (admin) con acceso total; sumar roles es
 * agregarlos acá y en el enum `app_role` de la base (las políticas RLS pasan por has_role).
 */
export const PERMISSIONS = {
  manageCatalog: ["admin"],
  manageInventory: ["admin"],
  managePurchasing: ["admin"],
  manageProduction: ["admin"],
  manageEmployees: ["admin"],
  manageMembers: ["admin"],
  manageSettings: ["admin"],
  viewReports: ["admin"],
} as const satisfies Record<string, readonly AppRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: AppRole | null | undefined, permission: Permission): boolean {
  return role ? (PERMISSIONS[permission] as readonly AppRole[]).includes(role) : false;
}
