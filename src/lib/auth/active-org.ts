/** Elige la fábrica activa: cookie válida → última usada válida → primera por nombre. */
export function resolveActiveOrganization(
  organizations: { id: string; name: string }[],
  cookieValue: string | null | undefined,
  lastOrganizationId: string | null | undefined,
): string | null {
  const ids = new Set(organizations.map((o) => o.id));
  if (cookieValue && ids.has(cookieValue)) return cookieValue;
  if (lastOrganizationId && ids.has(lastOrganizationId)) return lastOrganizationId;
  const [first] = [...organizations].sort((a, b) => a.name.localeCompare(b.name, "es"));
  return first?.id ?? null;
}

export const ACTIVE_ORG_COOKIE = "fabril_org";
