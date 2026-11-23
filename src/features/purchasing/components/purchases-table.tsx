"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";

import { columnHelper, DataTable, type DataColumn } from "@/components/data-table/data-table";
import type { TableParams } from "@/components/data-table/params";
import { ProgressBar } from "@/components/data/progress-bar";
import { StatusBadge } from "@/components/data/status-badge";
import { EmptyState } from "@/components/feedback/empty-state";
import type { PurchaseRow } from "@/features/purchasing/types";
import { PURCHASE_STATUS } from "@/lib/domain/status";
import { formatCurrency, formatDate } from "@/lib/format";

const col = columnHelper<PurchaseRow>();

function LateBadge() {
  return (
    <span className="inline-flex items-center rounded-sm bg-status-delayed/10 px-1.5 py-0.5 text-xs font-medium text-status-delayed">
      Vencida
    </span>
  );
}

/** Lista de compras: proveedor, entrega esperada (con marca de vencida), avance de recepción y total. */
export function PurchasesTable({
  rows,
  total,
  params,
}: {
  rows: PurchaseRow[];
  total: number;
  params: TableParams;
}) {
  const columns: DataColumn<PurchaseRow>[] = [
    col.accessor("code", {
      header: "Orden",
      meta: { sortKey: "code", className: "whitespace-nowrap" },
      cell: ({ row }) => (
        <Link
          href={`/app/compras/${row.original.id}`}
          className="font-mono text-13 font-medium underline-offset-4 hover:underline"
        >
          {row.original.code}
        </Link>
      ),
    }),
    col.accessor("supplierName", { header: "Proveedor", meta: { className: "min-w-40" } }),
    col.accessor("orderDate", {
      header: "Fecha",
      meta: { sortKey: "orderDate", className: "hidden lg:table-cell whitespace-nowrap" },
      cell: ({ getValue }) => formatDate(getValue()),
    }),
    col.accessor("expectedDate", {
      header: "Entrega esperada",
      meta: { sortKey: "expectedDate", className: "whitespace-nowrap" },
      cell: ({ row }) =>
        row.original.expectedDate ? (
          <span className="inline-flex items-center gap-2">
            {formatDate(row.original.expectedDate)}
            {row.original.isLate ? <LateBadge /> : null}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    }),
    col.accessor("receivedPct", {
      header: "Recepción",
      meta: { className: "hidden w-40 md:table-cell" },
      cell: ({ getValue }) => <ProgressBar value={getValue()} label="Recepción" />,
    }),
    col.accessor("total", {
      header: "Total",
      meta: { align: "right", sortKey: "total" },
      cell: ({ getValue }) => formatCurrency(getValue()),
    }),
    col.accessor("status", {
      header: "Estado",
      cell: ({ getValue }) => <StatusBadge kind="purchase" status={getValue()} />,
    }),
  ];

  const filtered = params.q !== "" || Object.keys(params.filters).length > 0;

  return (
    <DataTable
      columns={columns}
      rows={rows}
      total={total}
      params={params}
      getRowId={(r) => r.id}
      searchPlaceholder="Buscar por orden o proveedor"
      filters={[
        {
          id: "estado",
          label: "Estado",
          options: Object.entries(PURCHASE_STATUS).map(([value, meta]) => ({
            value,
            label: meta.label,
          })),
        },
      ]}
      mobileCard={(p) => (
        <div className="rounded-lg border bg-surface p-3">
          <div className="flex items-start justify-between gap-3">
            <Link href={`/app/compras/${p.id}`} className="min-w-0">
              <p className="font-mono text-13 font-medium">{p.code}</p>
              <p className="truncate text-xs text-muted-foreground">{p.supplierName}</p>
            </Link>
            <p className="tabular shrink-0 font-medium">{formatCurrency(p.total)}</p>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-13">
            <StatusBadge kind="purchase" status={p.status} />
            {p.isLate ? <LateBadge /> : null}
          </div>
        </div>
      )}
      emptyState={
        filtered ? (
          <EmptyState
            icon={ShoppingCart}
            title="Ninguna compra coincide con la búsqueda"
            description="Probá con otro código o proveedor, o quitá algunos filtros."
          />
        ) : (
          <EmptyState
            icon={ShoppingCart}
            title="Todavía no hay compras"
            description="Las compras nacen desde una orden de producción con faltantes de materiales."
          />
        )
      }
    />
  );
}
