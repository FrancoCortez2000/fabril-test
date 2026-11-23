import { StatCard } from "@/components/data/stat-card";
import type { ItemDetail } from "@/features/items/detail-queries";
import { formatCurrency, formatPercent, formatQuantity } from "@/lib/format";

const EMPTY = <span className="text-muted-foreground">—</span>;

/** Resumen de la ficha: stock, costos, precio y margen. Nunca muestra el costo manual. */
export function ItemSummary({ detail }: { detail: ItemDetail }) {
  const { item, costing, marginPct } = detail;
  const isProduct = item.type === "finished_good";

  return (
    <div className="space-y-4">
      {item.archived ? (
        <p className="w-fit rounded-md border bg-surface-2 px-3 py-1.5 text-13 text-muted-foreground">
          Archivado
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Stock" value={formatQuantity(item.currentStock, item.unitCode)} />
        <StatCard
          label="Disponible"
          value={formatQuantity(item.available, item.unitCode)}
          hint={`Comprometido: ${formatQuantity(item.committed, item.unitCode)}`}
        />
        <StatCard label="Mínimo" value={formatQuantity(item.minStock, item.unitCode)} />
        {isProduct ? (
          <>
            <StatCard
              label="Costo estándar"
              value={item.standardCost === null ? EMPTY : formatCurrency(item.standardCost)}
              hint={item.standardCost === null ? "Todavía no tiene receta" : "por unidad"}
            />
            <StatCard
              label="Precio de venta"
              value={item.salePrice === null ? EMPTY : formatCurrency(item.salePrice)}
            />
            <StatCard
              label="Margen"
              value={marginPct === null ? EMPTY : formatPercent(marginPct, 1)}
              hint={marginPct === null ? "Necesita precio y receta" : "sobre el precio de venta"}
            />
          </>
        ) : (
          <>
            <StatCard
              label="Costo promedio"
              value={formatCurrency(item.avgCost)}
              hint="ponderado del stock"
            />
            <StatCard
              label="Último costo de compra"
              value={item.lastPurchaseCost === null ? EMPTY : formatCurrency(item.lastPurchaseCost)}
            />
          </>
        )}
      </div>

      {costing ? (
        <section
          aria-label="Costo estándar por unidad"
          className="rounded-lg border bg-surface p-5"
        >
          <h2 className="text-sm font-semibold">Costo estándar por unidad</h2>
          <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:max-w-sm">
            <Row label="Materiales" value={costing.materials} />
            <Row label="Mano de obra" value={costing.labor} />
            <Row label="Gastos indirectos" value={costing.overhead} />
            <div className="mt-1 flex items-baseline justify-between border-t pt-2 font-semibold">
              <dt>Total</dt>
              <dd className="tabular">{formatCurrency(costing.standard)}</dd>
            </div>
          </dl>
        </section>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular">{formatCurrency(value)}</dd>
    </div>
  );
}
