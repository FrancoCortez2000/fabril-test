const LOCAL_ORIGIN = "http://fabril.invalid";

/**
 * Devuelve una ruta interna segura para redirigir después de ingresar.
 * Sólo acepta el panel (`/app…`) y `/restablecer`; cualquier otra cosa (URLs externas, `//`, `\`,
 * rutas que escapan con `..`) cae en `fallback`.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/app"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  let url: URL;
  try {
    url = new URL(raw, LOCAL_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== LOCAL_ORIGIN) return fallback;
  const path = url.pathname;
  const allowed = path === "/app" || path.startsWith("/app/") || path === "/restablecer";
  return allowed ? path + url.search : fallback;
}

const isPanel = (pathname: string) => pathname === "/app" || pathname.startsWith("/app/");
const GUEST_ONLY = new Set(["/ingresar", "/recuperar"]);

/** Decisión del proxy: a dónde redirigir según la ruta y si hay sesión. */
export function routeDecision(
  pathname: string,
  search: string,
  isAuthenticated: boolean,
): { redirectTo: string } | null {
  if (!isAuthenticated && isPanel(pathname)) {
    return { redirectTo: `/ingresar?next=${encodeURIComponent(pathname + search)}` };
  }
  if (isAuthenticated && GUEST_ONLY.has(pathname)) {
    return { redirectTo: "/app" };
  }
  return null;
}
