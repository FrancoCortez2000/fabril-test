"use client";

import { MoreHorizontal, Package, PackagePlus, Pencil } from "lucide-react";
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
import { ProductFormDialog } from "@/features/products/components/product-form-dialog";
import { StockCell } from "@/features/products/components/stock-cell";
import type { ProductFormValues } from "@/features/products/schemas";
import type { ProductCategory, ProductRow } from "@/fixtures/products";
import { STOCK_LEVEL_LABELS } from "@/lib/domain/stock";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";

const col = columnHelper<ProductRow>();

function toFormValues(p: ProductRow): ProductFormValues {
  return {
    name: p.name,
    sku: p.sku,
    description: p.description,
    categoryId: p.category?.id ?? null,
    unitCode: p.unitCode,
    minStock: p.minStock,
    salePrice: p.salePrice,
    manualCost: p.estimatedCost,
    status: p.status,
  };
}

function ProductThumb() {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-surface-2">
      <Package aria-hidden className="size-4 text-muted-foreground" />
    </span>
  );
}

function StatusText({ status }: { status: ProductRow["status"] }) {
  return (
    <span className={cn("text-13", status === "inactive" && "text-muted-foreground")}>
      {status === "active" ? "Activo" : "Inactivo"}
    </span>
  );
}

export function ProductsTable({
  rows,
  total,
  params,
  categories,
  openNew,
}: {
  rows: ProductRow[];
  total: number;
  params: TableParams;
  categories: ProductCategory[];
  /** Abrir el formulario de alta al cargar (`?nuevo=1`, desde el menú de comandos). */
  openNew: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
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

  const columns: DataColumn<ProductRow>[] = [
    col.accessor("name", {
      header: "Producto",
      meta: { sortKey: "name", className: "min-w-64" },
      cell: ({ row }) => (
        <span className="flex items-center gap-3">
          <ProductThumb />
          <span className="min-w-0">
            <span className="block truncate font-medium">{row.original.name}</span>
            <span className="block font-mono text-xs text-muted-foreground">
              {row.original.sku}
            </span>
          </span>
        </span>
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
    col.accessor("estimatedCost", {
      header: "Costo estimado",
      meta: { align: "right", sortKey: "cost" },
      cell: ({ getValue }) => formatCurrency(getValue()),
    }),
    col.accessor("salePrice", {
      header: "Precio de venta",
      meta: { align: "right", sortKey: "price", className: "hidden lg:table-cell" },
      cell: ({ getValue }) => {
        const v = getValue();
        return v === null ? <span className="text-muted-foreground">—</span> : formatCurrency(v);
      },
    }),
    col.accessor("status", {
      header: "Estado",
      cell: ({ getValue }) => <StatusText status={getValue()} />,
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
            ],
          },
        ]}
        toolbarActions={
          <Button onClick={() => setDialog({ open: true })}>
            <PackagePlus aria-hidden />
            Nuevo producto
          </Button>
        }
        mobileCard={(p) => (
          <div className="rounded-lg border bg-surface p-3">
            <div className="flex items-start gap-3">
              <ProductThumb />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
              </div>
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
              <StatusText status={p.status} />
            </div>
          </div>
        )}
        emptyState={
          filtered ? (
            <EmptyState
              icon={Package}
              title="Ningún producto coincide con la búsqueda"
              description="Probá con otro nombre o SKU, o quitá algunos filtros."
            />
          ) : (
            <EmptyState
              icon={Package}
              title="Todavía no cargaste productos"
              description="Cargá tu primer producto terminado para poder armar su receta y planificar su fabricación."
              action={
                <Button onClick={() => setDialog({ open: true })}>
                  <PackagePlus aria-hidden />
                  Nuevo producto
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
