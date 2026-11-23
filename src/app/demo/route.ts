import { NextResponse, type NextRequest } from "next/server";

import { DEMO_COOKIE } from "@/lib/auth/demo";
import { getPublicDemoOrganization } from "@/lib/auth/demo-org";

/**
 * "Probar la demo": deja la cookie-bandera del modo demo y entra al panel, sin cuenta. Si todavía no
 * hay una demo pública cargada, avisa en la pantalla de ingreso.
 */
export async function GET(request: NextRequest) {
  const org = await getPublicDemoOrganization();
  if (!org) return NextResponse.redirect(new URL("/ingresar?demo=no-disponible", request.url));

  const response = NextResponse.redirect(new URL("/app", request.url));
  response.cookies.set(DEMO_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
