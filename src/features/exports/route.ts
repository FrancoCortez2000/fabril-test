import "server-only";

import type { ExportData } from "@/features/exports/queries";
import { todayInBuenosAires } from "@/features/purchasing/schemas";
import { requireSession } from "@/lib/auth/session";
import { csvResponse } from "@/lib/csv";

/**
 * Handler `GET` de una exportación: lee la fábrica activa de la sesión (la demo también puede
 * descargar: es sólo lectura), arma el CSV y lo entrega como adjunto `<nombre>-<fecha>.csv`.
 */
export function exportRoute(name: string, load: (orgId: string) => Promise<ExportData>) {
  return async function GET(): Promise<Response> {
    const session = await requireSession();
    try {
      const { columns, rows } = await load(session.activeOrganizationId);
      return csvResponse(`${name}-${todayInBuenosAires()}.csv`, columns, rows);
    } catch {
      return new Response("No se pudo generar la exportación. Probá de nuevo.", { status: 500 });
    }
  };
}
