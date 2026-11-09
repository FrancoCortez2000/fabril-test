/**
 * DATOS DE EJEMPLO (Etapa 2). Se reemplazan por la sesión real de Supabase en la Etapa 3.
 */
export type SessionOrganization = { id: string; name: string; isDemo: boolean };

export type AppSession = {
  user: { name: string; email: string };
  organizations: SessionOrganization[];
  activeOrganizationId: string;
};

export const FIXTURE_SESSION: AppSession = {
  user: { name: "Laura Benítez", email: "laura@plasticoslitoral.com.ar" },
  organizations: [{ id: "org-demo", name: "Plásticos del Litoral S.A.", isDemo: true }],
  activeOrganizationId: "org-demo",
};
