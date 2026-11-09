"use client";

import { Boxes, Factory, PackageSearch, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ProgressBar } from "@/components/data/progress-bar";
import { StatCard } from "@/components/data/stat-card";
import { StatusBadge } from "@/components/data/status-badge";
import { Timeline } from "@/components/data/timeline";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { DateInput } from "@/components/forms/date-input";
import { ImageInput } from "@/components/forms/image-input";
import { MoneyInput, NumberInput } from "@/components/forms/number-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { ProductionStatus, PurchaseStatus } from "@/lib/domain/status";

const PRODUCTION: ProductionStatus[] = [
  "planned",
  "in_progress",
  "quality_check",
  "completed",
  "cancelled",
];
const PURCHASE: PurchaseStatus[] = [
  "draft",
  "pending",
  "partially_received",
  "received",
  "closed",
  "cancelled",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function KitShowcase() {
  const [qty, setQty] = useState<number | null>(0.25);
  const [price, setPrice] = useState<number | null>(1850.5);
  const [date, setDate] = useState<string | null>("2026-11-09");

  return (
    <div className="space-y-16">
      <Section title="Estados">
        <div className="grid gap-4 rounded-lg border bg-surface p-4 sm:grid-cols-2">
          <ul className="space-y-2">
            {PRODUCTION.map((s) => (
              <li key={s}>
                <StatusBadge kind="production" status={s} />
              </li>
            ))}
            <li>
              <StatusBadge kind="production" status="in_progress" delayed />
            </li>
          </ul>
          <ul className="space-y-2">
            {PURCHASE.map((s) => (
              <li key={s}>
                <StatusBadge kind="purchase" status={s} />
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section title="Indicadores">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Unidades fabricadas en noviembre"
            value={formatNumber(18420)}
            icon={Factory}
            delta={{ value: 12, direction: "up", positiveIsGood: true }}
            hint="vs. octubre"
          />
          <StatCard label="Valor del inventario" value={formatCurrency(48_730_215)} icon={Boxes} />
          <StatCard
            label="Desperdicio de material"
            value="3,8 %"
            delta={{ value: 6, direction: "up", positiveIsGood: false }}
            hint="vs. octubre"
          />
        </div>
        <div className="space-y-3 rounded-lg border bg-surface p-4">
          <ProgressBar value={62} label="Avance OP-2026-0042" />
          <ProgressBar value={100} tone="success" label="Avance OP-2026-0039" />
          <ProgressBar value={35} tone="danger" label="Avance OP-2026-0031" />
        </div>
      </Section>

      <Section title="Historial">
        <div className="rounded-lg border bg-surface p-5">
          <Timeline
            items={[
              {
                id: "1",
                title: "Pasó a Control de calidad",
                at: "2026-11-09T17:35:00Z",
                actor: "Laura Benítez",
              },
              {
                id: "2",
                title: "Parte de avance: 1.200 buenas, 18 defectuosas",
                description: "Turno mañana · Inyectora 2",
                at: "2026-11-08T14:10:00Z",
                actor: "Laura Benítez",
              },
              {
                id: "3",
                title: "Pasó a En producción",
                at: "2026-11-06T11:00:00Z",
                actor: "Laura Benítez",
              },
            ]}
          />
        </div>
      </Section>

      <Section title="Campos especiales">
        <div className="grid gap-4 rounded-lg border bg-surface p-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="kit-qty">Cantidad por unidad</Label>
            <NumberInput id="kit-qty" value={qty} onChange={setQty} decimals={3} unit="kg" />
            <p className="tabular text-xs text-muted-foreground">Valor: {String(qty)}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kit-price">Precio de venta</Label>
            <MoneyInput id="kit-price" value={price} onChange={setPrice} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kit-date">Fecha de inicio</Label>
            <DateInput id="kit-date" value={date} onChange={setDate} clearable />
          </div>
          <div className="sm:col-span-3">
            <ImageInput onChange={() => {}} />
          </div>
        </div>
      </Section>

      <Section title="Vacío, error y confirmación">
        <EmptyState
          icon={PackageSearch}
          title="Todavía no cargaste productos"
          description="Cargá tu primer producto terminado para poder armar su receta y planificar su fabricación."
          action={<Button>Nuevo producto</Button>}
        />
        <ErrorState
          description="Revisá tu conexión y volvé a intentar. Si el problema sigue, avisanos."
          onRetry={() => toast("Reintentando…")}
        />
        <div className="rounded-lg border bg-surface p-4">
          <ConfirmDialog
            trigger={
              <Button variant="destructive">
                <Trash2 aria-hidden />
                Archivar producto
              </Button>
            }
            title="¿Archivar «Bidón 5 L azul»?"
            description="Deja de aparecer en listados y formularios. Su historial de movimientos y órdenes se conserva."
            confirmLabel="Archivar producto"
            destructive
            onConfirm={async () => {
              await new Promise((r) => setTimeout(r, 700));
              toast.success("Producto archivado");
            }}
          />
        </div>
      </Section>
    </div>
  );
}
