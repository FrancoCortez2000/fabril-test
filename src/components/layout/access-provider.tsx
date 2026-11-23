"use client";

import { createContext, useContext, useMemo } from "react";

import { can as canDo, type Permission } from "@/lib/auth/permissions";
import type { AppRole, SessionMode } from "@/lib/auth/types";

type Access = {
  mode: SessionMode;
  role: AppRole | null;
  can: (permission: Permission) => boolean;
};

// Sin proveedor el acceso es de sólo lectura: nunca se asume un rol por omisión.
const DEFAULT_ACCESS: Access = { mode: "member", role: null, can: () => false };

const AccessContext = createContext<Access>(DEFAULT_ACCESS);

/**
 * Pone el rol y el modo de la sesión a disposición de los componentes de cliente (botones de guardar,
 * menús). Es sólo para la interfaz: el permiso real lo exige la base de datos.
 */
export function AccessProvider({
  role,
  mode,
  children,
}: {
  role: AppRole | null;
  mode: SessionMode;
  children: React.ReactNode;
}) {
  const value = useMemo<Access>(
    () => ({ mode, role, can: (permission) => canDo(role, permission) }),
    [mode, role],
  );
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess(): Access {
  return useContext(AccessContext);
}
