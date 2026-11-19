import type { Metadata } from "next";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { KitShowcase } from "./kit-showcase";

export const metadata: Metadata = {
  title: "Sistema de diseño",
  robots: { index: false, follow: false },
};

const COLORS = [
  { name: "Fondo", token: "bg-background", hex: "#F3F4F6 / #15191E" },
  { name: "Superficie", token: "bg-surface", hex: "#FFFFFF / #1B2026" },
  { name: "Superficie 2", token: "bg-surface-2", hex: "#E9ECEF / #232931" },
  { name: "Borde", token: "bg-border", hex: "#D9DDE2 / #2F363F" },
  { name: "Tinta", token: "bg-ink", hex: "#1C2127 / #E6E9ED" },
  { name: "Texto secundario", token: "bg-muted-foreground", hex: "#5B6670 / #98A2AD" },
  { name: "Marca (señal)", token: "bg-brand", hex: "#F2A900 / #F2B71F" },
  { name: "Peligro", token: "bg-danger", hex: "#C62828 / #EF5350" },
];

const TYPE_SCALE = [
  { label: "64 · display", className: "font-display text-6xl" },
  { label: "48 · display", className: "font-display text-5xl" },
  { label: "32 · título de página", className: "font-display text-4xl" },
  { label: "24 · título de sección", className: "text-2xl font-semibold" },
  { label: "20 · subtítulo", className: "text-xl font-medium" },
  { label: "16 · texto largo", className: "text-base" },
  { label: "14 · interfaz", className: "text-sm" },
  { label: "13 · tablas densas", className: "text-13" },
  { label: "12 · ayudas", className: "text-xs text-muted-foreground" },
];

const CONTRAST = [
  ["Tinta sobre marca (botón primario)", "8,06:1", "9,72:1"],
  ["Texto secundario sobre superficie", "5,87:1", "6,33:1"],
  ["Texto secundario sobre fondo", "5,33:1", "6,81:1"],
  ["Anillo de foco sobre fondo", "4,14:1", "9,72:1"],
  ["Peligro sobre superficie", "5,62:1", "4,70:1"],
];

export default function EstilosPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-16 px-4 py-12 sm:px-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display text-4xl">Sistema de diseño</h1>
          <p className="max-w-prose text-muted-foreground">
            Referencia interna de colores, tipografía y componentes de FABRIL. Cambiá el tema para
            revisar ambos modos.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <section className="space-y-4" aria-labelledby="colores">
        <h2 id="colores" className="text-xl font-semibold">
          Colores
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COLORS.map((c) => (
            <li key={c.name} className="overflow-hidden rounded-lg border bg-surface">
              <div className={`h-16 ${c.token} border-b`} />
              <div className="space-y-0.5 p-3">
                <p className="font-medium">{c.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{c.hex}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4" aria-labelledby="tipografia">
        <h2 id="tipografia" className="text-xl font-semibold">
          Tipografía
        </h2>
        <p className="text-muted-foreground">
          Archivo para toda la interfaz; los títulos usan su ancho condensado. IBM Plex Mono sólo
          para códigos: <span className="font-mono text-foreground">BID-5L-AZ</span>,{" "}
          <span className="font-mono text-foreground">OP-2026-0042</span>.
        </p>
        <div className="divide-y rounded-lg border bg-surface">
          {TYPE_SCALE.map((t) => (
            <div
              key={t.label}
              className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:gap-6"
            >
              <span className="w-44 shrink-0 text-xs text-muted-foreground">{t.label}</span>
              <span className={`${t.className} truncate`}>Bidón 5 L · 1.000 u</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="botones">
        <h2 id="botones" className="text-xl font-semibold">
          Botones
        </h2>
        <div className="flex flex-wrap gap-3 rounded-lg border bg-surface p-4">
          <Button>Nueva orden de producción</Button>
          <Button variant="outline">Registrar compra</Button>
          <Button variant="secondary">Exportar</Button>
          <Button variant="ghost">Cancelar</Button>
          <Button variant="destructive-solid">Cancelar orden</Button>
          <Button disabled>Deshabilitado</Button>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="campos">
        <h2 id="campos" className="text-xl font-semibold">
          Campos
        </h2>
        <div className="grid gap-4 rounded-lg border bg-surface p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="demo-nombre">Nombre del producto</Label>
            <Input id="demo-nombre" placeholder="Bidón 5 L azul" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-error">SKU</Label>
            <Input id="demo-error" defaultValue="BID 5L" aria-invalid="true" />
            <p className="text-xs text-danger">Usá letras, números y guiones.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="contraste">
        <h2 id="contraste" className="text-xl font-semibold">
          Contraste verificado (WCAG)
        </h2>
        <table className="w-full overflow-hidden rounded-lg border bg-surface text-left">
          <thead className="bg-surface-2 text-xs text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Par</th>
              <th className="p-3 font-medium">Claro</th>
              <th className="p-3 font-medium">Oscuro</th>
            </tr>
          </thead>
          <tbody className="tabular divide-y">
            {CONTRAST.map(([pair, light, dark]) => (
              <tr key={pair}>
                <td className="p-3">{pair}</td>
                <td className="p-3">{light}</td>
                <td className="p-3">{dark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <KitShowcase />
    </main>
  );
}
