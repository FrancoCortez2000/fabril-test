"use client";

import { Boxes, MoreHorizontal, Package, PackagePlus, Pencil } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { columnHelper, DataTable, type DataColumn } from "@/components/data-table/data-table";
import { serializeTableParams, type TableParams } from "@/components/data-table/params";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ITEM_LABELS,
  ITEM_PATHS,
  type ItemCategory,
  type ItemKind,
  type ItemRow,
} from "@/features/items/types";
import { ProductFormDialog } from "@/features/products/components/product-form-dialog";
import { StockCell } from "@/features/products/components/stock-cell";
import type { ProductFormValues } from "@/features/products/schemas";
import { STOCK_LEVEL_LABELS } from "@/lib/domain/stock";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";

const col = columnHelper<ItemRow>();

function toFormValues(p: ItemRow): ProductFormValues {
  return {
    name: p.name,
    sku: p.sku,
    description: p.description,
    categoryId: p.category?.id ?? null,
    unitCode: p.unitCode,
    minStock: p.minStock,
    salePrice: p.salePrice,
    manualCost: null,
    status: p.status,
  };
}

function ItemThumb({ kind }: { kind: ItemKind }) {
  const Icon = kind === "raw_material" ? Boxes : Package;
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-surface-2">
      <Icon aria-hidden className="size-4 text-muted-foreground" />
    </span>
  );
}

function StatusText({ row }: { row: Pick<ItemRow, "status" | "archived"> }) {
  const muted = row.archived || row.status === "inactive";
  const label = row.archived ? "Archivado" : row.status === "active" ? "Activo" : "Inactivo";
  return <span className={cn("text-13", muted && "text-muted-foreground")}>{label}</span>;
}

/** Lista de productos o de materias primas (misma tabla, distintos textos y columnas). */
export function ProductsTable({
  kind,
  rows,
  total,
  params,
  categories,
  openNew,
}: {
  kind: ItemKind;
  rows: ItemRow[];
  total: number;
  params: TableParams;
  categories: ItemCategory[];
  /** Abrir el formulario de alta al cargar (`?nuevo=1`, desde el menú de comandos). */
  openNew: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const labels = ITEM_LABELS[kind];
  const isProduct = kind === "finished_good";
  const [dialog, setDialog] = useState<{ open: boolean; values?: ProductFormValues }>({
    open: openNew,
  });

  // `?nuevo=1` puede llegar estando ya en la página (menú de comandos): abrir el alta.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con la URL
    if (openNew) setDialog({ open: true });
  }, [openNew]);

  function setOpen(open: boolean) {
    setDialog((d) => ({ ...d, open }));
    if (!open && openNew) {
      // Quitar sólo `nuevo`, conservando búsqueda, filtros, orden y página.
      const qs = serializeTableParams(params).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }

  const columns: DataColumn<ItemRow>[] = [
    col.accessor("name", {
      header: isProduct ? "Producto" : "Materia prima",
      meta: { sortKey: "name", className: "min-w-64" },
      cell: ({ row }) => (
        <Link
          href={`${ITEM_PATHS[kind]}/${row.original.id}`}
          className="flex items-center gap-3 rounded-md hover:underline"
        >
          <ItemThumb kind={kind} />
          <span className="min-w-0">
            <span className="block truncate font-medium">{row.original.name}</span>
            <span className="block font-mono text-xs text-muted-foreground">
              {row.original.sku}
            </span>
          </span>
        </Link>
      ),
    }),
    col.accessor((r) => r.category?.name ?? "", {
      id: "category",
      header: "Categoría",
      meta: { className: "hidden xl:table-cell" },
      cell: ({ getValue }) => getValue() || <span className="text-muted-foreground">—</span>,
    }),
    col.accessor("currentStock", {
      header: "Stock actual",
      meta: { sortKey: "stock" },
      cell: ({ row }) => (
        <StockCell
          current={row.original.currentStock}
          min={row.original.minStock}
          unitCode={row.original.unitCode}
        />
      ),
    }),
    col.accessor("minStock", {
      header: "Mínimo",
      meta: { align: "right", className: "hidden lg:table-cell" },
      cell: ({ row }) => formatQuantity(row.original.minStock, row.original.unitCode),
    }),
    col.accessor("cost", {
      header: labels.costLabel,
      meta: { align: "right", sortKey: "cost" },
      cell: ({ getValue }) => {
        const v = getValue();
        return v === null ? <span className="text-muted-foreground">—</span> : formatCurrency(v);
      },
    }),
  ];

  if (isProduct) {
    columns.push(
      col.accessor("salePrice", {
        header: "Precio de venta",
        meta: { align: "right", sortKey: "price", className: "hidden lg:table-cell" },
        cell: ({ getValue }) => {
          const v = getValue();
          return v === null ? <span className="text-muted-foreground">—</span> : formatCurrency(v);
        },
      }),
    );
  }

  columns.push(
    col.display({
      id: "status",
      header: "Estado",
      cell: ({ row }) => <StatusText row={row.original} />,
    }),
    col.display({
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      meta: { className: "w-12" },
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Acciones para ${row.original.name}`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => setDialog({ open: true, values: toFormValues(row.original) })}
            >
              <Pencil aria-hidden />
              Editar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
  );

  const filtered = params.q !== "" || Object.keys(params.filters).length > 0;
  const EmptyIcon = isProduct ? Package : Boxes;

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        total={total}
        params={params}
        getRowId={(r) => r.id}
        searchPlaceholder="Buscar por nombre o SKU"
        filters={[
          {
            id: "categoria",
            label: "Categoría",
            options: categories.map((c) => ({ value: c.id, label: c.name })),
          },
          {
            id: "stock",
            label: "Nivel de stock",
            options: (["out", "low", "ok"] as const).map((v) => ({
              value: v,
              label: STOCK_LEVEL_LABELS[v],
            })),
          },
          {
            id: "estado",
            label: "Estado",
            options: [
              { value: "active", label: "Activo" },
              { value: "inactive", label: "Inactivo" },
              { value: "archived", label: "Archivado" },
            ],
          },
        ]}
        toolbarActions={
          <Button onClick={() => setDialog({ open: true })}>
            <PackagePlus aria-hidden />
            {labels.newLabel}
          </Button>
        }
        mobileCard={(p) => (
          <div className="rounded-lg border bg-surface p-3">
            <div className="flex items-start gap-3">
              <ItemThumb kind={kind} />
              <Link href={`${ITEM_PATHS[kind]}/${p.id}`} className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
              </Link>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Editar ${p.name}`}
                onClick={() => setDialog({ open: true, values: toFormValues(p) })}
              >
                <Pencil />
              </Button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-13">
              <StockCell current={p.currentStock} min={p.minStock} unitCode={p.unitCode} />
              <StatusText row={p} />
            </div>
          </div>
        )}
        emptyState={
          filtered ? (
            <EmptyState
              icon={EmptyIcon}
              title={
                isProduct
                  ? "Ningún producto coincide con la búsqueda"
                  : "Ninguna materia prima coincide con la búsqueda"
              }
              description="Probá con otro nombre o SKU, o quitá algunos filtros."
            />
          ) : (
            <EmptyState
              icon={EmptyIcon}
              title={
                isProduct ? "Todavía no cargaste productos" : "Todavía no cargaste materias primas"
              }
              description={
                isProduct
                  ? "Cargá tu primer producto terminado para poder armar su receta y planificar su fabricación."
                  : "Cargá las materias primas que usás para fabricar, con su unidad y su stock mínimo."
              }
              action={
                <Button onClick={() => setDialog({ open: true })}>
                  <PackagePlus aria-hidden />
                  {labels.newLabel}
                </Button>
              }
            />
          )
        }
      />
      <ProductFormDialog
        open={dialog.open}
        onOpenChange={setOpen}
        categories={categories}
        initialValues={dialog.values}
      />
    </>
  );
}
