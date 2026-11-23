// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";

import type { TableParams } from "@/components/data-table/params";
import { OrdersTable } from "@/features/production/components/orders-table";
import { OP_ID, orderRow } from "@/features/production/test-fixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/app/produccion",
}));

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const params: TableParams = { page: 1, pageSize: 25, sort: null, q: "", filters: {} };

const renderTable = (rows = [orderRow()]) =>
  render(<OrdersTable rows={rows} total={rows.length} params={params} />);

test("muestra código, producto, producido sobre planificado, prioridad y estado", () => {
  renderTable();
  expect(screen.getAllByText("OP-2026-0056").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Balde 10 L rojo").length).toBeGreaterThan(0);
  expect(screen.getAllByText("300 / 900 u").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Normal").length).toBeGreaterThan(0);
  expect(screen.getAllByText("En producción").length).toBeGreaterThan(0);
  expect(screen.getAllByText("30/11/2026").length).toBeGreaterThan(0);
});

test("cada orden enlaza a su ficha", () => {
  renderTable();
  const links = screen.getAllByRole("link", { name: /OP-2026-0056/ });
  expect(links.length).toBeGreaterThan(0);
  for (const link of links) expect(link).toHaveAttribute("href", `/app/produccion/${OP_ID}`);
});

test("muestra el progreso de cada orden", () => {
  renderTable();
  const bars = screen.getAllByRole("progressbar");
  expect(bars.length).toBeGreaterThan(0);
  expect(bars[0]).toHaveAttribute("aria-valuenow", "33");
});

test("marca como demorada sólo la orden atrasada", () => {
  renderTable([
    orderRow({ isDelayed: true }),
    orderRow({
      id: "55555555-5555-4555-8555-555555555555",
      code: "OP-2026-0057",
      isDelayed: false,
    }),
  ]);
  const delayedRows = screen.getAllByRole("row").filter((r) => r.textContent?.includes("Demorada"));
  expect(delayedRows.length).toBe(1);
  expect(delayedRows[0]?.textContent).toContain("OP-2026-0056");
});

test("una orden sin fecha de fin muestra un guion", () => {
  renderTable([orderRow({ plannedEndDate: null })]);
  expect(screen.getAllByText("—").length).toBeGreaterThan(0);
});

test("sin órdenes explica cómo crear la primera", () => {
  renderTable([]);
  expect(screen.getByText(/todavía no hay órdenes de producción/i)).toBeVisible();
});
