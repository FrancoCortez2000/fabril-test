// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";

import type { TableParams } from "@/components/data-table/params";
import { PurchasesTable } from "@/features/purchasing/components/purchases-table";
import { purchase } from "@/features/purchasing/test-fixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/app/compras",
}));

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const params: TableParams = { page: 1, pageSize: 25, sort: null, q: "", filters: {} };

const renderTable = (rows = [purchase()]) =>
  render(<PurchasesTable rows={rows} total={rows.length} params={params} />);

test("muestra código, proveedor, total, fechas y estado", () => {
  renderTable();
  expect(screen.getAllByText("OC-2026-0001").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Petroquímica Sur").length).toBeGreaterThan(0);
  expect(screen.getAllByText(/15\.730,00/).length).toBeGreaterThan(0);
  expect(screen.getAllByText("01/09/2026").length).toBeGreaterThan(0);
  expect(screen.getAllByText("01/10/2026").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Parcialmente recibida").length).toBeGreaterThan(0);
});

test("cada compra enlaza a su ficha", () => {
  renderTable();
  const links = screen.getAllByRole("link", { name: /OC-2026-0001/ });
  expect(links.length).toBeGreaterThan(0);
  for (const link of links) {
    expect(link).toHaveAttribute("href", "/app/compras/11111111-1111-4111-8111-111111111111");
  }
});

test("marca como vencida la compra con entrega atrasada y sólo esa", () => {
  renderTable([
    purchase({ isLate: true }),
    purchase({ id: "77777777-7777-4777-8777-777777777777", code: "OC-2026-0002", isLate: false }),
  ]);
  expect(screen.getAllByText("Vencida").length).toBeGreaterThan(0);
  const lateRows = screen.getAllByRole("row").filter((r) => r.textContent?.includes("Vencida"));
  expect(lateRows.every((r) => r.textContent?.includes("OC-2026-0001"))).toBe(true);
});

test("una compra sin fecha de entrega muestra un guion", () => {
  renderTable([purchase({ expectedDate: null })]);
  expect(screen.getAllByText("—").length).toBeGreaterThan(0);
});

test("muestra el avance de la recepción", () => {
  renderTable();
  expect(screen.getAllByRole("progressbar").length).toBeGreaterThan(0);
});

test("sin compras muestra un estado vacío que explica cómo nacen", () => {
  renderTable([]);
  expect(screen.getByText(/todavía no hay compras/i)).toBeVisible();
  expect(screen.getByText(/orden de producción/i)).toBeVisible();
});
