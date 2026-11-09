"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

import { serializeTableParams, type TableParams } from "@/components/data-table/params";

/** Actualiza el estado de la tabla en la URL (sin agregar entradas al historial). */
export function useTableUrl(params: TableParams) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const update = useCallback(
    (patch: Partial<TableParams>, opts: { resetPage?: boolean } = { resetPage: true }) => {
      const next: TableParams = {
        ...params,
        ...patch,
        page: opts.resetPage && patch.page === undefined ? 1 : (patch.page ?? params.page),
      };
      const qs = serializeTableParams(next).toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [params, pathname, router],
  );

  return { update, pending };
}
