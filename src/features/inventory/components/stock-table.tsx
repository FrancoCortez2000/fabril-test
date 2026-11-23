"use client";

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  ClipboardCheck,
  MoreHorizontal,
  Package,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { columnHelper, DataTable, type DataColumn } from "@/components/data-table/data-table";
import type { TableParams } from "@/components/data-table/params";
import { StatCard } from "@/components/data/stat-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdjustmentDialog } from "@/features/inventory/components/adjustment-dialog";
import { MovementDialog } from "@/features/inventory/components/movement-dialog";
import type { StockRow, StockTotals } from "@/features/inventory/queries";
import { ITEM_PATHS, type ItemCategory } from "@/features/items/types";
import { StockCell } from "@/features/products/components/stock-cell";
import { STOCK_LEVEL_LABELS } from "@/lib/domain/stock";
import { formatCurrency, formatNumber, formatQuantity } from "@/lib/format";

const col = columnHelper<StockRow>();

type Action = { item: StockRow; kind: "in" | "out" | "adjust" } | null;

/** Existencias de la fábrica: stock, comprometido, disponible y valor, con entradas, salidas y ajustes. */
export function StockTable({
  rows,
  total,
  params,
  categories,
  totals,
}: {
  rows: StockRow[];
  total: number;
  params: TableParams;
  categories: ItemCategory[];
  totals: StockTotals;
}) {
  const [action, setAction] = useState<Action>(null);
  const close = (open: boolean) => {
    if (!open) setAction(null);
  };

  const columns: DataColumn<StockRow>[] = [
    col.accessor("name", {
      header: "Ítem",
      meta: { sortKey: "name", className: "min-w-56" },
      cell: ({ row }) => (
        <Link
          href={`${ITEM_PATHS[row.original.type]}/${row.original.itemId}`}
          className="flex items-center gap-3 rounded-md hover:underline"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-surface-2">
            {row.original.type === "raw_material" ? (
              <Boxes aria-hidden className="size-4 text-muted-foreground" />
            ) : (
              <Package aria-hidden className="size-4 text-muted-foreground" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{row.original.name}</span>
            <span className="block font-mono text-xs text-muted-foreground">
              {row.original.sku}
            </span>
          </span>
        </Link>
      ),
    }),
    col.display({
      id: "type",
      header: "Tipo",
      meta: { className: "hidden lg:table-cell" },
      cell: ({ row }) => (row.original.type === "raw_material" ? "Materia prima" : "Producto"),
    }),
    col.accessor("physical", {
      header: "Stock",
      meta: { sortKey: "physical" },
      cell: ({ row }) => (
        <StockCell
          current={row.original.physical}
          min={row.original.minStock}
          unitCode={row.original.unitCode}
        />
      ),
    }),
    col.accessor("committed", {
      header: "Comprometido",
      meta: { align: "right", className: "hidden xl:table-cell" },
      cell: ({ row }) => formatQuantity(row.original.committed, row.original.unitCode),
    }),
    col.accessor("available", {
      header: "Disponible",
      meta: { align: "right", sortKey: "available" },
      cell: ({ row }) => formatQuantity(row.original.available, row.original.unitCode),
    }),
    col.accessor("value", {
      header: "Valor",
      meta: { align: "right", sortKey: "value", className: "hidden md:table-cell" },
      cell: ({ getValue }) => formatCurrency(getValue()),
    }),
    col.display({
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      meta: { className: "w-12" },
      cell: ({ row }) => <RowMenu item={row.original} onAction={setAction} />,
    }),
  ];

  const filtered = params.q !== "" || Object.keys(params.filters).length > 0;

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Valor del inventario"
          value={formatCurrency(totals.value)}
          hint="a costo promedio"
          icon={Warehouse}
        />
        <StatCard label="Sin stock" value={formatNumber(totals.out)} hint="ítems agotados" />
        <StatCard
          label="Bajo el mínimo"
          value={formatNumber(totals.low)}
          hint="ítems por reponer"
        />
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        total={total}
        params={params}
        getRowId={(r) => r.itemId}
        searchPlaceholder="Buscar por nombre o SKU"
        filters={[
          {
            id: "tipo",
            label: "Tipo",
            options: [
              { value: "finished_good", label: "Productos" },
              { value: "raw_material", label: "Materias primas" },
            ],
          },
          {
            id: "categoria",
            label: "Categoría",
            options: categories.map((c) => ({ value: c.id, label: c.name })),
          },
          {
            id: "nivel",
            label: "Nivel de stock",
            options: (["out", "low", "ok"] as const).map((v) => ({
              value: v,
              label: STOCK_LEVEL_LABELS[v],
            })),
          },
        ]}
        mobileCard={(r) => (
          <div className="rounded-lg border bg-surface p-3">
            <div className="flex items-start gap-3">
              <Link href={`${ITEM_PATHS[r.type]}/${r.itemId}`} className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{r.sku}</p>
              </Link>
              <RowMenu item={r} onAction={setAction} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-13">
              <StockCell current={r.physical} min={r.minStock} unitCode={r.unitCode} />
              <span className="text-muted-foreground">
                Disp. {formatQuantity(r.available, r.unitCode)}
              </span>
            </div>
          </div>
        )}
        emptyState={
          filtered ? (
            <EmptyState
              icon={Warehouse}
              title="Ningún ítem coincide con la búsqueda"
              description="Probá con otro nombre o SKU, o quitá algunos filtros."
            />
          ) : (
            <EmptyState
              icon={Warehouse}
              title="Todavía no hay ítems en el inventario"
              description="Cargá productos y materias primas para ver sus existencias."
            />
          )
        }
      />
      {action && action.kind !== "adjust" ? (
        <MovementDialog
          open
          onOpenChange={close}
          item={action.item}
          type={action.kind === "in" ? "manual_in" : "manual_out"}
        />
      ) : null}
      {action && action.kind === "adjust" ? (
        <AdjustmentDialog open onOpenChange={close} item={action.item} />
      ) : null}
    </>
  );
}

function RowMenu({ item, onAction }: { item: StockRow; onAction: (action: Action) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${item.name}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onAction({ item, kind: "in" })}>
          <ArrowDownToLine aria-hidden />
          Entrada manual
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction({ item, kind: "out" })}>
          <ArrowUpFromLine aria-hidden />
          Salida manual
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction({ item, kind: "adjust" })}>
          <ClipboardCheck aria-hidden />
          Ajuste por conteo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
