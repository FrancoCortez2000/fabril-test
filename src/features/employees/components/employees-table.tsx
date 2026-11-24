"use client";

import { Pencil, Plus, Users } from "lucide-react";
import { useState } from "react";

import { columnHelper, DataTable, type DataColumn } from "@/components/data-table/data-table";
import type { TableParams } from "@/components/data-table/params";
import { EmptyState } from "@/components/feedback/empty-state";
import { useAccess } from "@/components/layout/access-provider";
import { Button } from "@/components/ui/button";
import { EmployeeDialog } from "@/features/employees/components/employee-dialog";
import {
  EMPLOYEE_STATUS_LABELS,
  type AreaOption,
  type EmployeeRow,
} from "@/features/employees/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const col = columnHelper<EmployeeRow>();
const DASH = <span className="text-muted-foreground">—</span>;

function StatusText({ status }: { status: EmployeeRow["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-13",
        status === "inactive" && "text-muted-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          status === "active" && "bg-status-completed",
          status === "on_leave" && "bg-status-pending",
          status === "inactive" && "bg-border",
        )}
      />
      {EMPLOYEE_STATUS_LABELS[status]}
    </span>
  );
}

/** Lista de empleados con alta y edición en un diálogo (en la demo, sólo lectura). */
export function EmployeesTable({
  rows,
  total,
  params,
  areas,
}: {
  rows: EmployeeRow[];
  total: number;
  params: TableParams;
  areas: AreaOption[];
}) {
  const { can, mode } = useAccess();
  const allowed = can("manageEmployees");
  // El costo por hora es un dato personal: la demo pública no lo muestra.
  const showCost = mode !== "demo";
  const reason = mode === "demo" ? "No disponible en la demo" : "No tenés permiso";
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [open, setOpen] = useState(false);

  function openDialog(employee: EmployeeRow | null) {
    setEditing(employee);
    setOpen(true);
  }

  const columns: DataColumn<EmployeeRow>[] = [
    col.accessor("name", {
      header: "Nombre",
      meta: { sortKey: "name", className: "min-w-40 font-medium" },
    }),
    col.accessor("position", {
      header: "Cargo",
      meta: { className: "hidden md:table-cell" },
      cell: ({ getValue }) => getValue() ?? DASH,
    }),
    col.accessor("areaName", {
      header: "Área",
      meta: { className: "hidden lg:table-cell" },
      cell: ({ getValue }) => getValue() ?? DASH,
    }),
    col.accessor("status", {
      header: "Estado",
      cell: ({ getValue }) => <StatusText status={getValue()} />,
    }),
    ...(showCost
      ? [
          col.accessor("hourlyCost", {
            header: "Costo por hora",
            meta: { align: "right", className: "hidden sm:table-cell" },
            cell: ({ getValue }) => (getValue() === null ? DASH : formatCurrency(getValue()!)),
          }),
        ]
      : []),
    col.display({
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      meta: { align: "right", className: "w-12" },
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Editar a ${row.original.name}`}
          disabled={!allowed}
          title={allowed ? undefined : reason}
          onClick={() => openDialog(row.original)}
        >
          <Pencil aria-hidden />
        </Button>
      ),
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
        getRowId={(r) => r.id}
        searchPlaceholder="Buscar por nombre o cargo"
        filters={[
          {
            id: "estado",
            label: "Estado",
            options: Object.entries(EMPLOYEE_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          },
        ]}
        toolbarActions={
          <Button
            onClick={() => openDialog(null)}
            disabled={!allowed}
            title={allowed ? undefined : reason}
          >
            <Plus aria-hidden />
            Nuevo empleado
          </Button>
        }
        mobileCard={(e) => (
          <div className="rounded-lg border bg-surface p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{e.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[e.position, e.areaName].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Editar a ${e.name}`}
                disabled={!allowed}
                title={allowed ? undefined : reason}
                onClick={() => openDialog(e)}
              >
                <Pencil aria-hidden />
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between text-13">
              <StatusText status={e.status} />
              {showCost ? (
                <span className="tabular">
                  {e.hourlyCost === null ? "—" : formatCurrency(e.hourlyCost)}
                </span>
              ) : null}
            </div>
          </div>
        )}
        emptyState={
          filtered ? (
            <EmptyState
              icon={Users}
              title="Ningún empleado coincide con la búsqueda"
              description="Probá con otro nombre o cargo, o quitá algunos filtros."
            />
          ) : (
            <EmptyState
              icon={Users}
              title="Todavía no hay empleados"
              description="Cargá a tu equipo para costear la mano de obra de cada orden."
            />
          )
        }
      />
      <EmployeeDialog open={open} onOpenChange={setOpen} employee={editing} areas={areas} />
    </>
  );
}
