import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

// La landing (/) no usa sesión: el proxy sólo corre en el panel y en las pantallas de acceso.
export const config = {
  matcher: ["/app", "/app/:path*", "/ingresar", "/recuperar", "/restablecer", "/sin-acceso"],
};
