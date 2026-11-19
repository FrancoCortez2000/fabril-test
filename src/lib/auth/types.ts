export type AppRole = "admin";

export type SessionOrganization = { id: string; name: string; isDemo: boolean; role: AppRole };

export type AppSession = {
  user: { id: string; name: string; email: string };
  organizations: SessionOrganization[];
  activeOrganizationId: string;
  role: AppRole;
};
