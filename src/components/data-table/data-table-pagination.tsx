"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { PAGE_SIZES, type PageSize, type TableParams } from "@/components/data-table/params";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber } from "@/lib/format";

export function DataTablePagination({
  params,
  total,
  onChange,
}: {
  params: TableParams;
  total: number;
  onChange: (patch: Partial<TableParams>, opts?: { resetPage?: boolean }) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / params.pageSize));
  const page = Math.min(params.page, pageCount);
  const from = total === 0 ? 0 : (page - 1) * params.pageSize + 1;
  const to = Math.min(total, page * params.pageSize);

  return (
    <div className="flex flex-col-reverse items-center justify-between gap-3 pt-3 sm:flex-row">
      <p className="tabular text-13 text-muted-foreground" aria-live="polite">
        Mostrando {formatNumber(from)}–{formatNumber(to)} de {formatNumber(total)}
      </p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-13 text-muted-foreground">
          <span id="page-size-label" className="hidden sm:inline">
            Filas por página
          </span>
          <Select
            value={String(params.pageSize)}
            onValueChange={(v) => onChange({ pageSize: Number(v) as PageSize })}
          >
            <SelectTrigger size="sm" className="w-18" aria-labelledby="page-size-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Página anterior"
            disabled={page <= 1}
            onClick={() => onChange({ page: page - 1 }, { resetPage: false })}
          >
            <ChevronLeft />
          </Button>
          <span className="tabular min-w-16 text-center text-13">
            {page} de {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Página siguiente"
            disabled={page >= pageCount}
            onClick={() => onChange({ page: page + 1 }, { resetPage: false })}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
