import Link from "next/link";

import { ProgressBar } from "@/components/data/progress-bar";
import { StatusBadge } from "@/components/data/status-badge";
import { Timeline } from "@/components/data/timeline";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Variance } from "@/features/production/components/variance";
import { actualTotal, plannedTotal } from "@/features/production/costs";
import {
  PRIORITY_LABELS,
  type OrderDetailData,
  type ProductionStatus,
} from "@/features/production/types";
import { PRODUCTION_STATUS } from "@/lib/domain/status";
import { formatCurrency, formatDate, formatNumber, formatQuantity } from "@/lib/format";

const ROLE_LABELS: Record<string, string> = {
  responsable: "Responsable",
  operario: "Operario",
  calidad: "Calidad",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section aria-label={label} className="space-y-3">
      <h2 className="text-sm font-semibold">{label}</h2>
      {children}
    </section>
  );
}

/** Ficha de una orden de producción: avance, materiales, personal, partes, costos y historial. */
export function OrderDetail({ data }: { data: OrderDetailData }) {
  const { order, materials, team, reports, events } = data;
  const planned = plannedTotal(order);
  const actual = actualTotal(order);
  const plannedUnit = order.plannedQty > 0 ? planned / order.plannedQty : 0;

  const costRows = [
    { label: "Materiales", planned: order.plannedMaterialCost, actual: order.actualMaterialCost },
    { label: "Mano de obra", planned: order.plannedLaborCost, actual: order.actualLaborCost },
    {
      label: "Gastos indirectos",
      planned: order.plannedOverheadCost,
      actual: order.actualOverheadCost,
    },
  ];

  return (
    <div className="space-y-8">
      <dl className="grid gap-4 rounded-lg border bg-surface p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Producto">
          <Link href={`/app/productos/${order.itemId}`} className="hover:underline">
            <span className="block font-medium">{order.itemName}</span>
            <span className="block font-mono text-xs text-muted-foreground">{order.itemSku}</span>
          </Link>
        </Field>
        <Field label="Estado">
          <StatusBadge kind="production" status={order.status} delayed={order.isDelayed} />
        </Field>
        <Field label="Prioridad">{PRIORITY_LABELS[order.priority] ?? order.priority}</Field>
        <Field label="Producido">
          <span className="tabular">
            {formatNumber(order.goodQty)} / {formatQuantity(order.plannedQty, order.unitCode)}
          </span>
          {order.defectiveQty > 0 ? (
            <span className="block text-xs text-muted-foreground">
              {formatQuantity(order.defectiveQty, order.unitCode)} defectuosas
            </span>
          ) : null}
        </Field>
        <Field label="Inicio previsto">
          {order.plannedStartDate ? formatDate(order.plannedStartDate) : "—"}
        </Field>
        <Field label="Fin previsto">
          {order.plannedEndDate ? formatDate(order.plannedEndDate) : "—"}
        </Field>
        <div className="sm:col-span-2">
          <ProgressBar value={order.progressPct} label="Avance de la orden" />
        </div>
      </dl>

      {order.status === "cancelled" && order.cancelReason ? (
        <p className="rounded-md border bg-surface-2 px-4 py-3 text-13">
          <span className="font-medium">Motivo de la cancelación:</span> {order.cancelReason}
        </p>
      ) : null}
      {order.notes ? <p className="text-13 text-muted-foreground">{order.notes}</p> : null}

      <Section label="Materiales">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead className="text-right">Planificado</TableHead>
              <TableHead className="text-right">Consumido</TableHead>
              <TableHead className="text-right">Devuelto</TableHead>
              <TableHead className="text-right">Merma</TableHead>
              <TableHead className="hidden text-right md:table-cell">Costo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <Link href={`/app/materias-primas/${m.itemId}`} className="hover:underline">
                    <span className="block font-medium">{m.itemName}</span>
                    <span className="block font-mono text-xs text-muted-foreground">{m.sku}</span>
                  </Link>
                </TableCell>
                <TableCell className="tabular text-right">
                  {formatQuantity(m.plannedQty, m.unitCode)}
                </TableCell>
                <TableCell className="tabular text-right">
                  {formatQuantity(m.consumedQty, m.unitCode)}
                </TableCell>
                <TableCell className="tabular text-right">
                  {formatQuantity(m.returnedQty, m.unitCode)}
                </TableCell>
                <TableCell className="tabular text-right">
                  {formatQuantity(m.scrapQty, m.unitCode)}
                </TableCell>
                <TableCell className="tabular hidden text-right md:table-cell">
                  {formatCurrency(m.costConsumed)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section label="Personal">
          {team.length === 0 ? (
            <p className="text-13 text-muted-foreground">Sin personal asignado.</p>
          ) : (
            <ul className="divide-y rounded-lg border bg-surface">
              {team.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{t.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {ROLE_LABELS[t.role] ?? t.role}
                      {t.position ? ` · ${t.position}` : ""}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-13 text-muted-foreground">
                    {formatNumber(t.hoursWorked)} h
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section label="Partes de avance">
          {reports.length === 0 ? (
            <p className="text-13 text-muted-foreground">Todavía no hay partes de avance.</p>
          ) : (
            <ul className="divide-y rounded-lg border bg-surface">
              {reports.map((r) => (
                <li key={r.id} className="space-y-0.5 px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm">{formatDate(r.reportDate)}</span>
                    <span className="tabular text-13">
                      {formatNumber(r.goodQty)} buenas
                      {r.defectiveQty > 0 ? ` · ${formatNumber(r.defectiveQty)} defectuosas` : ""}
                    </span>
                  </div>
                  {r.notes || r.employeeName ? (
                    <p className="space-x-1 text-xs text-muted-foreground">
                      {r.employeeName ? <span>{r.employeeName}</span> : null}
                      {r.employeeName && r.notes ? <span>·</span> : null}
                      {r.notes ? <span>{r.notes}</span> : null}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section label="Costos">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead />
              <TableHead className="text-right">Planificado</TableHead>
              <TableHead className="text-right">Real</TableHead>
              <TableHead className="text-right">Desvío</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costRows.map((c) => (
              <TableRow key={c.label}>
                <TableCell className="font-medium">{c.label}</TableCell>
                <TableCell className="tabular text-right">{formatCurrency(c.planned)}</TableCell>
                <TableCell className="tabular text-right">
                  {c.actual === null ? "—" : formatCurrency(c.actual)}
                </TableCell>
                <TableCell className="tabular text-right">
                  <Variance planned={c.planned} actual={c.actual} />
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold">
              <TableCell>Total</TableCell>
              <TableCell className="tabular text-right">{formatCurrency(planned)}</TableCell>
              <TableCell className="tabular text-right">
                {actual === null ? "—" : formatCurrency(actual)}
              </TableCell>
              <TableCell className="tabular text-right">
                <Variance planned={planned} actual={actual} />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Costo unitario</TableCell>
              <TableCell className="tabular text-right">{formatCurrency(plannedUnit)}</TableCell>
              <TableCell className="tabular text-right">
                {order.actualUnitCost === null ? "—" : formatCurrency(order.actualUnitCost)}
              </TableCell>
              <TableCell className="tabular text-right">
                <Variance planned={plannedUnit} actual={order.actualUnitCost} />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {actual === null ? (
          <p className="text-13 text-muted-foreground">
            El costo real se calcula al completar la orden, con lo que se consumió de verdad.
          </p>
        ) : null}
      </Section>

      <Section label="Historial">
        <Timeline
          items={events.map((e) => ({
            id: e.id,
            title: PRODUCTION_STATUS[e.toStatus as ProductionStatus]?.label ?? e.toStatus,
            description: e.note ?? undefined,
            at: e.occurredAt,
          }))}
        />
      </Section>
    </div>
  );
}
