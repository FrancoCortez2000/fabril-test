import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { DEMO_COOKIE } from "@/lib/auth/demo";
import { routeDecision } from "@/lib/auth/redirect";
import { getPublicEnv } from "@/lib/env";

/** Refresca la sesión en cada request protegido y aplica las redirecciones de acceso. */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const env = getPublicEnv();

  const supabase = createServerClient(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet)
          response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // getClaims valida el JWT; del lado del servidor no se confía en getSession().
  const { data } = await supabase.auth.getClaims();
  const decision = routeDecision(
    request.nextUrl.pathname,
    request.nextUrl.search,
    Boolean(data?.claims?.sub),
    request.cookies.has(DEMO_COOKIE),
  );
  if (!decision) return response;

  const redirect = NextResponse.redirect(new URL(decision.redirectTo, request.url));
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}
