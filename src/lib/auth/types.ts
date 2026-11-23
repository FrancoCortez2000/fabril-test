export type AppRole = "admin";

/** `role` es `null` cuando el usuario no tiene un rol conocido (p. ej. el visitante de la demo). */
export type SessionOrganization = {
  id: string;
  name: string;
  isDemo: boolean;
  role: AppRole | null;
};

/**
 * `member`: usuario con cuenta. `demo`: visitante anónimo de la demo pública (sólo lectura; el
 * acceso lo limita la base con RLS, no esta bandera).
 */
export type SessionMode = "member" | "demo";

export type AppSession = {
  user: { id: string; name: string; email: string };
  organizations: SessionOrganization[];
  activeOrganizationId: string;
  role: AppRole | null;
  mode: SessionMode;
};
