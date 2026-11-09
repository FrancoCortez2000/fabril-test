"use client";

import {
  createColumnHelper,
  tableFeatures,
  useTable,
  type CellData,
  type ColumnDef,
  type RowData,
  type TableFeatures,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import type { FilterDef } from "@/components/data-table/data-table-filter";
import type { TableParams } from "@/components/data-table/params";
import { useTableUrl } from "@/components/data-table/use-table-url";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-unused-vars -- la augmentación exige repetir los genéricos */
declare module "@tanstack/table-core" {
  interface ColumnMeta<
    TFeatures extends TableFeatures,
    TData extends RowData,
    TValue extends CellData,
  > {
    /** Clave de orden en la URL; si existe, el encabezado permite ordenar. */
    sortKey?: string;
    align?: "left" | "right";
    /** Clases para celdas y encabezado (anchos, ocultar en tablet, etc.). */
    className?: string;
  }
}
/* eslint-enable @typescript-eslint/no-unused-vars */

/** Las tablas sólo dibujan: orden, filtros y paginación los resuelve el servidor vía URL. */
export const TABLE_FEATURES = tableFeatures({});
export type DataColumn<T extends RowData> = ColumnDef<typeof TABLE_FEATURES, T, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- valores heterogéneos por columna
export const columnHelper = <T extends RowData>() => createColumnHelper<typeof TABLE_FEATURES, T>();

export type DataTableProps<T extends RowData> = {
  columns: DataColumn<T>[];
  rows: T[];
  total: number;
  params: TableParams;
  getRowId: (row: T) => string;
  searchPlaceholder?: string;
  filters?: FilterDef[];
  /** Versión compacta de cada fila para pantallas chicas. */
  mobileCard: (row: T) => React.ReactNode;
  emptyState: React.ReactNode;
  /** Si existe, la fila entera navega a ese destino. */
  rowHref?: (row: T) => string;
  toolbarActions?: React.ReactNode;
};

function SortIcon({ state }: { state: "asc" | "desc" | false }) {
  if (state === "asc") return <ArrowUp aria-hidden className="size-3.5" />;
  if (state === "desc") return <ArrowDown aria-hidden className="size-3.5" />;
  return <ChevronsUpDown aria-hidden className="size-3.5 opacity-40" />;
}

export function DataTable<T extends RowData>({
  columns,
  rows,
  total,
  params,
  getRowId,
  searchPlaceholder,
  filters,
  mobileCard,
  emptyState,
  rowHref,
  toolbarActions,
}: DataTableProps<T>) {
  const router = useRouter();
  const { update, pending } = useTableUrl(params);
  const table = useTable({
    features: TABLE_FEATURES,
    columns,
    data: rows,
    getRowId: (row) => getRowId(row),
  });

  const onChange = useCallback(
    (patch: Partial<TableParams>, opts?: { resetPage?: boolean }) => update(patch, opts),
    [update],
  );

  function toggleSort(sortKey: string) {
    const current = params.sort?.id === sortKey ? params.sort : null;
    const next = !current
      ? { id: sortKey, desc: false }
      : !current.desc
        ? { id: sortKey, desc: true }
        : null;
    update({ sort: next });
  }

  const isEmpty = rows.length === 0;

  return (
    <div>
      <DataTableToolbar
        params={params}
        filters={filters}
        searchPlaceholder={searchPlaceholder}
        pending={pending}
        onChange={onChange}
      >
        {toolbarActions}
      </DataTableToolbar>

      {isEmpty ? (
        emptyState
      ) : (
        <div className={cn("transition-opacity", pending && "opacity-60")} aria-busy={pending}>
          {/* Escritorio y tablet */}
          <div className="hidden overflow-hidden rounded-lg border bg-surface md:block">
            <Table>
              <TableHeader className="bg-surface-2/60">
                {table.getHeaderGroups().map((group) => (
                  <TableRow key={group.id} className="hover:bg-transparent">
                    {group.headers.map((header) => {
                      const meta = header.column.columnDef.meta;
                      const sortKey = meta?.sortKey;
                      const sortState =
                        sortKey && params.sort?.id === sortKey
                          ? params.sort.desc
                            ? "desc"
                            : "asc"
                          : false;
                      return (
                        <TableHead
                          key={header.id}
                          aria-sort={
                            sortState === "asc"
                              ? "ascending"
                              : sortState === "desc"
                                ? "descending"
                                : undefined
                          }
                          className={cn(
                            "h-10 text-xs font-medium text-muted-foreground",
                            meta?.align === "right" && "text-right",
                            meta?.className,
                          )}
                        >
                          {header.isPlaceholder ? null : sortKey ? (
                            <button
                              type="button"
                              onClick={() => toggleSort(sortKey)}
                              className={cn(
                                "-mx-1.5 inline-flex items-center gap-1 rounded-sm px-1.5 py-1 hover:bg-accent hover:text-foreground",
                                meta?.align === "right" && "flex-row-reverse",
                              )}
                            >
                              <table.FlexRender header={header} />
                              <SortIcon state={sortState} />
                            </button>
                          ) : (
                            <table.FlexRender header={header} />
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => {
                  const href = rowHref?.(row.original);
                  return (
                    <TableRow
                      key={row.id}
                      className={cn("h-11", href && "cursor-pointer")}
                      onClick={
                        href
                          ? (e) => {
                              // Respetar clics en enlaces/botones internos.
                              if ((e.target as HTMLElement).closest("a,button,[role=menuitem]"))
                                return;
                              router.push(href);
                            }
                          : undefined
                      }
                    >
                      {row.getAllCells().map((cell) => {
                        const meta = cell.column.columnDef.meta;
                        return (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              "text-13",
                              meta?.align === "right" && "tabular text-right",
                              meta?.className,
                            )}
                          >
                            <table.FlexRender cell={cell} />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Teléfono */}
          <ul className="space-y-2 md:hidden">
            {rows.map((row) => (
              <li key={getRowId(row)}>{mobileCard(row)}</li>
            ))}
          </ul>
        </div>
      )}

      {total > 0 ? <DataTablePagination params={params} total={total} onChange={onChange} /> : null}
    </div>
  );
}
