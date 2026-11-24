import { NextResponse, type NextRequest } from "next/server";

import { searchRecords } from "@/features/search/queries";
import { requireSession } from "@/lib/auth/session";

/** Búsqueda global para el menú de comandos. Sólo lectura: funciona también en la demo. */
export async function GET(request: NextRequest) {
  const session = await requireSession();
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 60);
  try {
    const hits = await searchRecords(session.activeOrganizationId, q);
    return NextResponse.json({ hits });
  } catch {
    return NextResponse.json({ hits: [] }, { status: 500 });
  }
}
