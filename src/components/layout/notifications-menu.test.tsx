// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { NotificationsMenu } from "@/components/layout/notifications-menu";
import type { DashboardAlert } from "@/features/dashboard/types";

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const KINDS: DashboardAlert["kind"][] = [
  "low_stock",
  "out_of_stock",
  "delayed_order",
  "late_purchase",
];

const alert = (i: number, kind: DashboardAlert["kind"] = "low_stock"): DashboardAlert => ({
  kind,
  title: `Alerta ${i}`,
  detail: `Detalle ${i}`,
  href: `/app/destino/${i}`,
});

const make = (n: number) => Array.from({ length: n }, (_, i) => alert(i + 1));

describe("contador", () => {
  test("sin alertas no muestra número y la etiqueta lo dice", () => {
    render(<NotificationsMenu alerts={[]} />);
    expect(screen.getByRole("button", { name: "Alertas: ninguna" })).toBeVisible();
    expect(screen.queryByTestId("alerts-count")).toBeNull();
  });

  test("con 3 alertas muestra 3 y la etiqueta incluye la cantidad", () => {
    render(<NotificationsMenu alerts={make(3)} />);
    expect(screen.getByRole("button", { name: "Alertas: 3" })).toBeVisible();
    expect(screen.getByTestId("alerts-count")).toHaveTextContent("3");
  });

  test("con 1 alerta la etiqueta va en singular", () => {
    render(<NotificationsMenu alerts={make(1)} />);
    expect(screen.getByRole("button", { name: "Alertas: 1" })).toBeVisible();
  });

  test("con 12 alertas el número se topa en 9+ pero la etiqueta conserva la cantidad real", () => {
    render(<NotificationsMenu alerts={make(12)} />);
    expect(screen.getByTestId("alerts-count")).toHaveTextContent("9+");
    expect(screen.getByRole("button", { name: "Alertas: 12" })).toBeVisible();
  });

  test("con exactamente 9 muestra 9", () => {
    render(<NotificationsMenu alerts={make(9)} />);
    expect(screen.getByTestId("alerts-count")).toHaveTextContent(/^9$/);
  });
});

describe("lista", () => {
  test("cada tipo de alerta enlaza a su pantalla con título y detalle", async () => {
    const alerts = KINDS.map((k, i) => alert(i + 1, k));
    render(<NotificationsMenu alerts={alerts} />);
    await userEvent.click(screen.getByRole("button", { name: "Alertas: 4" }));
    for (const [i] of alerts.entries()) {
      const link = await screen.findByRole("link", { name: new RegExp(`Alerta ${i + 1}`) });
      expect(link).toHaveAttribute("href", `/app/destino/${i + 1}`);
      expect(link).toHaveTextContent(`Detalle ${i + 1}`);
    }
    expect(screen.getByText("Sin stock")).toBeVisible();
    expect(screen.getByText("Orden demorada")).toBeVisible();
    expect(screen.getByText("Compra vencida")).toBeVisible();
    expect(screen.getByText("Stock bajo")).toBeVisible();
  });

  test("sin alertas conserva el estado vacío", async () => {
    render(<NotificationsMenu alerts={[]} />);
    await userEvent.click(screen.getByRole("button", { name: "Alertas: ninguna" }));
    expect(await screen.findByText("Sin alertas por ahora")).toBeVisible();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
