"use client";

import { History, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { columnHelper, DataTable, type DataColumn } from "@/components/data-table/data-table";
import type { TableParams } from "@/components/data-table/params";
import { useTableUrl } from "@/components/data-table/use-table-url";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentReference } from "@/features/inventory/components/document-reference";
import { ReverseDialog } from "@/features/inventory/components/reverse-dialog";
import { signedQuantity } from "@/features/inventory/format";
import { MOVEMENT_TYPE_LABELS, type MovementRow } from "@/features/inventory/types";
import { ITEM_PATHS, type ItemKind } from "@/features/items/types";
import { formatCurrency, formatDateTime, formatQuantity } from "@/lib/format";

const col = columnHelper<MovementRow>();

export type ItemOption = { id: string; name: string; sku: string; type: ItemKind };

/** Historial de movimientos de stock, con fechas, tipo e ítem como filtros y reversión de los manuales. */
export function MovementsTable({
  rows,
  total,
  params,
  items,
}: {
  rows: MovementRow[];
  total: number;
  params: TableParams;
  items: ItemOption[];
}) {
  const [reversing, setReversing] = useState<MovementRow | null>(null);
  const typeById = new Map(items.map((i) => [i.id, i.type]));
  const itemHref = (m: MovementRow) =>
    `${ITEM_PATHS[typeById.get(m.itemId) ?? "raw_material"]}/${m.itemId}`;

  const columns: DataColumn<MovementRow>[] = [
    col.accessor("occurredAt", {
      header: "Fecha",
      meta: { sortKey: "occurredAt", className: "whitespace-nowrap" },
      cell: ({ getValue }) => formatDateTime(getValue()),
    }),
    col.accessor("itemName", {
      header: "Ítem",
      meta: { className: "min-w-44" },
      cell: ({ row }) => (
        <Link href={itemHref(row.original)} className="rounded-md hover:underline">
          <span className="block truncate font-medium">{row.original.itemName}</span>
          <span className="block font-mono text-xs text-muted-foreground">{row.original.sku}</span>
        </Link>
      ),
    }),
    col.accessor("type", {
      header: "Tipo",
      cell: ({ getValue }) => MOVEMENT_TYPE_LABELS[getValue()] ?? getValue(),
    }),
    col.accessor("quantity", {
      header: "Cantidad",
      meta: { align: "right", sortKey: "quantity" },
      cell: ({ row }) => signedQuantity(row.original.quantity, row.original.unitCode),
    }),
    col.accessor("unitCost", {
      header: "Costo unitario",
      meta: { align: "right", className: "hidden xl:table-cell" },
      cell: ({ getValue }) => (getValue() === null ? "—" : formatCurrency(getValue() as number)),
    }),
    col.accessor("balanceAfter", {
      header: "Saldo",
      meta: { align: "right", className: "hidden lg:table-cell" },
      cell: ({ row }) =>
        row.original.balanceAfter === null
          ? "—"
          : formatQuantity(row.original.balanceAfter, row.original.unitCode),
    }),
    col.display({
      id: "detail",
      header: "Detalle",
      cell: ({ row }) => <Detail m={row.original} />,
    }),
    col.display({
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      meta: { className: "w-28" },
      cell: ({ row }) =>
        row.original.reversible ? (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Revertir movimiento de ${row.original.itemName}`}
            onClick={() => setReversing(row.original)}
          >
            <Undo2 aria-hidden />
            Revertir
          </Button>
        ) : null,
    }),
  ];

  const filtered = params.q !== "" || Object.keys(params.filters).length > 0;

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        total={total}
        params={params}
        getRowId={(m) => m.id}
        searchPlaceholder="Buscar por ítem, motivo o documento"
        filters={[
          {
            id: "tipo",
            label: "Tipo",
            options: Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          },
          {
            id: "item",
            label: "Ítem",
            options: items.map((i) => ({ value: i.id, label: `${i.name} (${i.sku})` })),
          },
        ]}
        toolbarActions={<DateRange params={params} />}
        mobileCard={(m) => (
          <div className="rounded-lg border bg-surface p-3">
            <div className="flex items-start justify-between gap-3">
              <Link href={itemHref(m)} className="min-w-0">
                <p className="truncate font-medium">{m.itemName}</p>
                <p className="text-xs text-muted-foreground">
                  {MOVEMENT_TYPE_LABELS[m.type] ?? m.type} · {formatDateTime(m.occurredAt)}
                </p>
              </Link>
              <p className="tabular shrink-0 font-medium">
                {signedQuantity(m.quantity, m.unitCode)}
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-13">
              <Detail m={m} />
              {m.reversible ? (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Revertir movimiento de ${m.itemName}`}
                  onClick={() => setReversing(m)}
                >
                  <Undo2 aria-hidden />
                  Revertir
                </Button>
              ) : null}
            </div>
          </div>
        )}
        emptyState={
          filtered ? (
            <EmptyState
              icon={History}
              title="Ningún movimiento coincide con los filtros"
              description="Probá con otro rango de fechas o quitá algún filtro."
            />
          ) : (
            <EmptyState
              icon={History}
              title="Todavía no hay movimientos"
              description="Las compras, la producción y las entradas, salidas y ajustes manuales quedan registrados acá."
            />
          )
        }
      />
      {reversing ? (
        <ReverseDialog
          open
          onOpenChange={(open) => {
            if (!open) setReversing(null);
          }}
          movement={reversing}
        />
      ) : null}
    </>
  );
}

function Detail({ m }: { m: MovementRow }) {
  return (
    <span className="space-x-2">
      <DocumentReference reference={m.reference} type={m.referenceType} id={m.referenceId} />
      {m.reason ? <span className="text-13">{m.reason}</span> : null}
      {m.reversed ? (
        <span className="rounded-sm bg-surface-2 px-1.5 py-0.5 text-xs text-muted-foreground">
          Revertido
        </span>
      ) : null}
    </span>
  );
}

/** Rango de fechas (desde / hasta) que viaja por la URL junto con el resto de los filtros. */
function DateRange({ params }: { params: TableParams }) {
  const { update } = useTableUrl(params);
  const set = (key: "desde" | "hasta", value: string) => {
    const filters = { ...params.filters };
    if (value) filters[key] = [value];
    else delete filters[key];
    update({ filters });
  };
  return (
    <div className="flex items-end gap-2">
      {(["desde", "hasta"] as const).map((key) => (
        <div key={key} className="space-y-1">
          <Label htmlFor={`mov-${key}`} className="text-xs text-muted-foreground">
            {key === "desde" ? "Desde" : "Hasta"}
          </Label>
          <Input
            id={`mov-${key}`}
            type="date"
            className="h-8 w-36"
            defaultValue={params.filters[key]?.[0] ?? ""}
            onChange={(e) => set(key, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
