"use client";

import { Factory } from "lucide-react";
import Link from "next/link";

import { columnHelper, DataTable, type DataColumn } from "@/components/data-table/data-table";
import type { TableParams } from "@/components/data-table/params";
import { ProgressBar } from "@/components/data/progress-bar";
import { StatusBadge } from "@/components/data/status-badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { PRIORITY_LABELS, type OrderRow } from "@/features/production/types";
import { PRODUCTION_STATUS } from "@/lib/domain/status";
import { formatDate, formatNumber, formatQuantity } from "@/lib/format";

const col = columnHelper<OrderRow>();

/** Lista de órdenes de producción: avance, prioridad, fin previsto (con marca de demorada) y estado. */
export function OrdersTable({
  rows,
  total,
  params,
}: {
  rows: OrderRow[];
  total: number;
  params: TableParams;
}) {
  const columns: DataColumn<OrderRow>[] = [
    col.accessor("code", {
      header: "Orden",
      meta: { sortKey: "code", className: "whitespace-nowrap" },
      cell: ({ row }) => (
        <Link
          href={`/app/produccion/${row.original.id}`}
          className="font-mono text-13 font-medium underline-offset-4 hover:underline"
        >
          {row.original.code}
        </Link>
      ),
    }),
    col.accessor("itemName", {
      header: "Producto",
      meta: { className: "min-w-44" },
      cell: ({ row }) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium">{row.original.itemName}</span>
          <span className="block font-mono text-xs text-muted-foreground">
            {row.original.itemSku}
          </span>
        </span>
      ),
    }),
    col.display({
      id: "produced",
      header: "Producido",
      meta: { align: "right", className: "whitespace-nowrap" },
      cell: ({ row }) =>
        `${formatNumber(row.original.goodQty)} / ${formatQuantity(row.original.plannedQty, row.original.unitCode)}`,
    }),
    col.accessor("progressPct", {
      header: "Avance",
      meta: { sortKey: "progress", className: "hidden w-36 lg:table-cell" },
      cell: ({ getValue }) => <ProgressBar value={getValue()} label="Avance de la orden" />,
    }),
    col.accessor("priority", {
      header: "Prioridad",
      meta: { className: "hidden xl:table-cell" },
      cell: ({ row }) => PRIORITY_LABELS[row.original.priority] ?? row.original.priority,
    }),
    col.accessor("plannedEndDate", {
      header: "Fin previsto",
      meta: { sortKey: "plannedEndDate", className: "hidden whitespace-nowrap md:table-cell" },
      cell: ({ getValue }) =>
        getValue() ? (
          formatDate(getValue() as string)
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    }),
    col.accessor("status", {
      header: "Estado",
      cell: ({ row }) => (
        <StatusBadge
          kind="production"
          status={row.original.status}
          delayed={row.original.isDelayed}
        />
      ),
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
      searchPlaceholder="Buscar por orden o producto"
      filters={[
        {
          id: "estado",
          label: "Estado",
          options: Object.entries(PRODUCTION_STATUS).map(([value, meta]) => ({
            value,
            label: meta.label,
          })),
        },
        {
          id: "prioridad",
          label: "Prioridad",
          options: Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label })),
        },
        { id: "demorada", label: "Demoradas", options: [{ value: "1", label: "Sólo demoradas" }] },
      ]}
      mobileCard={(o) => (
        <div className="rounded-lg border bg-surface p-3">
          <div className="flex items-start justify-between gap-3">
            <Link href={`/app/produccion/${o.id}`} className="min-w-0">
              <p className="font-mono text-13 font-medium">{o.code}</p>
              <p className="truncate text-xs text-muted-foreground">{o.itemName}</p>
            </Link>
            <StatusBadge kind="production" status={o.status} delayed={o.isDelayed} />
          </div>
          <div className="mt-3">
            <ProgressBar value={o.progressPct} label="Avance de la orden" />
            <p className="tabular mt-1 text-xs text-muted-foreground">
              {formatNumber(o.goodQty)} / {formatQuantity(o.plannedQty, o.unitCode)}
            </p>
          </div>
        </div>
      )}
      emptyState={
        filtered ? (
          <EmptyState
            icon={Factory}
            title="Ninguna orden coincide con los filtros"
            description="Probá con otro código o producto, o quitá algunos filtros."
          />
        ) : (
          <EmptyState
            icon={Factory}
            title="Todavía no hay órdenes de producción"
            description="Planificá la primera desde Nueva orden: ves los materiales y los faltantes antes de empezar."
          />
        )
      }
    />
  );
}
