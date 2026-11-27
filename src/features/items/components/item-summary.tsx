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

      {costing ? <CostBreakdown costing={costing} salePrice={item.salePrice} /> : null}
    </div>
  );
}

type Costing = NonNullable<ItemDetail["costing"]>;

/** Colores de serie en orden fijo (tokens validados): la misma parte siempre del mismo color. */
const PART_COLOR = ["bg-series-1", "bg-series-2", "bg-series-3", "bg-series-4"] as const;

/**
 * Desglose del costo estándar a todo el ancho: una barra fina con la composición y, debajo, cada
 * parte con su monto y su porcentaje. Con precio de venta que cubre el costo, la barra reparte el
 * precio (costo + ganancia); si no, reparte sólo el costo.
 */
function CostBreakdown({ costing, salePrice }: { costing: Costing; salePrice: number | null }) {
  const profit =
    salePrice !== null && salePrice > costing.standard ? salePrice - costing.standard : null;
  const loss =
    salePrice !== null && salePrice > 0 && salePrice < costing.standard
      ? costing.standard - salePrice
      : null;
  const whole = profit !== null ? (salePrice as number) : costing.standard;
  const parts = [
    { label: "Materiales", value: costing.materials },
    { label: "Mano de obra", value: costing.labor },
    { label: "Gastos indirectos", value: costing.overhead },
    ...(profit !== null ? [{ label: "Ganancia", value: profit }] : []),
  ].map((p, i) => ({
    ...p,
    color: PART_COLOR[i]!,
    share: whole > 0 ? (p.value / whole) * 100 : 0,
  }));
  const of = profit !== null ? "del precio de venta" : "del costo";
  const summary = parts.map((p) => `${p.label} ${formatPercent(p.share, 1)}`).join(", ");

  return (
    <section aria-label="Costo estándar por unidad" className="rounded-lg border bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="text-sm font-semibold">Costo estándar por unidad</h2>
        <p className="text-sm">
          <span className="text-muted-foreground">Total </span>
          <span className="font-semibold">{formatCurrency(costing.standard)}</span>
        </p>
      </div>

      {/* Barra segmentada fina: 8 px, extremos redondeados y 2 px de separación entre partes. */}
      <div
        role="img"
        aria-label={`Composición ${of}: ${summary}`}
        className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full"
      >
        {parts
          .filter((p) => p.share > 0)
          .map((p) => (
            <div
              key={p.label}
              className={p.color}
              style={{ flexBasis: `${p.share}%`, flexGrow: 0, flexShrink: 1 }}
              title={`${p.label}: ${formatCurrency(p.value)} (${formatPercent(p.share, 1)})`}
            />
          ))}
      </div>

      <dl
        className={`mt-4 grid grid-cols-2 gap-x-6 gap-y-4 ${parts.length === 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`}
      >
        {parts.map((p) => (
          <div key={p.label} className="min-w-0">
            <dt className="flex items-center gap-2 text-13 text-muted-foreground">
              <span aria-hidden className={`size-2.5 shrink-0 rounded-sm ${p.color}`} />
              {p.label}
            </dt>
            <dd className="mt-1 text-lg font-semibold">{formatCurrency(p.value)}</dd>
            <dd className="text-xs text-muted-foreground">
              <span className="tabular">{formatPercent(p.share, 1)}</span> {of}
            </dd>
          </div>
        ))}
      </dl>

      {loss !== null ? (
        <p className="mt-4 text-13 text-status-delayed">
          Con el precio de venta actual se pierden {formatCurrency(loss)} por unidad.
        </p>
      ) : null}
    </section>
  );
}
