// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";

import { AlertsPanel } from "@/features/dashboard/components/alerts-panel";
import { RecentActivity } from "@/features/dashboard/components/recent-activity";
import type { ActivityEntry, DashboardAlert } from "@/features/dashboard/types";

const alerts: DashboardAlert[] = Array.from({ length: 8 }, (_, i) => ({
  kind: "low_stock",
  title: `Alerta ${i}`,
  detail: "Quedan 5 u",
  href: `/app/productos/${i}`,
}));
const entries: ActivityEntry[] = Array.from({ length: 8 }, (_, i) => ({
  id: `a${i}`,
  summary: `Actividad ${i}`,
  actor: "Equipo",
  at: "2026-11-20T10:00:00-03:00",
}));
const now = new Date("2026-11-20T23:59:59-03:00");

// En el tablero cada panel toma el alto del gráfico de al lado y su lista se desplaza por dentro.
describe("paneles laterales del tablero", () => {
  test("aceptan la clase de posición que les da la página", () => {
    const { container } = render(
      <>
        <AlertsPanel alerts={alerts} className="lg:absolute" />
        <RecentActivity entries={entries} now={now} className="lg:absolute" />
      </>,
    );
    const sections = container.querySelectorAll("section");
    expect(sections).toHaveLength(2);
    for (const s of sections) expect(s.className).toContain("lg:absolute");
  });

  test("la lista de alertas se desplaza dentro del panel", () => {
    render(<AlertsPanel alerts={alerts} />);
    const list = screen.getByRole("list");
    expect(list.className).toMatch(/overflow-y-auto/);
    expect(list.className).toMatch(/min-h-0/);
  });

  test("la lista de actividad se desplaza y se puede recorrer con el teclado", () => {
    render(<RecentActivity entries={entries} now={now} />);
    const list = screen.getByRole("list", { name: "Actividad reciente" });
    expect(list.className).toMatch(/overflow-y-auto/);
    expect(list).toHaveAttribute("tabindex", "0");
  });
});
