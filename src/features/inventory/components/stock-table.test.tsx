// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { TableParams } from "@/components/data-table/params";
import { AccessProvider } from "@/components/layout/access-provider";
import { StockTable } from "@/features/inventory/components/stock-table";
import type { StockRow } from "@/features/inventory/queries";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/app/inventario",
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/inventory/actions", () => ({
  registerMovement: vi.fn(),
  registerAdjustment: vi.fn(),
}));

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const params: TableParams = { page: 1, pageSize: 25, sort: null, q: "", filters: {} };

const row = (over: Partial<StockRow> = {}): StockRow => ({
  itemId: "11111111-1111-4111-8111-111111111111",
  type: "raw_material",
  sku: "PEAD",
  name: "PEAD virgen",
  categoryName: "Resinas",
  unitCode: "kg",
  minStock: 500,
  physical: 300,
  committed: 20,
  available: 280,
  avgCost: 1000,
  value: 300000,
  level: "low",
  ...over,
});

function renderTable(
  rows: StockRow[],
  role: "admin" | null = "admin",
  mode: "member" | "demo" = "member",
) {
  return render(
    <AccessProvider role={role} mode={mode}>
      <StockTable
        rows={rows}
        total={rows.length}
        params={params}
        categories={[{ id: "22222222-2222-4222-8222-222222222222", name: "Resinas" }]}
        totals={{ value: 350000.5, out: 2, low: 1 }}
      />
    </AccessProvider>,
  );
}

test("muestra los totales del inventario", () => {
  renderTable([row()]);
  expect(screen.getByText("Valor del inventario")).toBeVisible();
  expect(screen.getByText(/350\.000,50/)).toBeVisible();
  expect(screen.getByText("Sin stock")).toBeVisible();
  expect(screen.getByText("Bajo el mínimo")).toBeVisible();
});

test("cada fila muestra stock, disponible, valor y el semáforo de nivel", () => {
  renderTable([
    row(),
    row({
      itemId: "33333333-3333-4333-8333-333333333333",
      name: "Aditivo",
      sku: "ADI",
      physical: 0,
      available: 0,
      value: 0,
      level: "out",
    }),
  ]);
  expect(screen.getAllByText("300 kg").length).toBeGreaterThan(0);
  expect(screen.getAllByText("280 kg").length).toBeGreaterThan(0);
  expect(screen.getAllByText(/300\.000,00/).length).toBeGreaterThan(0);
  expect(screen.getAllByText("Stock bajo").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Sin stock").length).toBeGreaterThan(1);
});

test("cada ítem enlaza a su ficha según su tipo", () => {
  renderTable([
    row(),
    row({
      itemId: "33333333-3333-4333-8333-333333333333",
      type: "finished_good",
      name: "Bidón",
      sku: "BID",
    }),
  ]);
  expect(screen.getAllByRole("link", { name: /PEAD virgen/ })[0]).toHaveAttribute(
    "href",
    "/app/materias-primas/11111111-1111-4111-8111-111111111111",
  );
  expect(screen.getAllByRole("link", { name: /Bidón/ })[0]).toHaveAttribute(
    "href",
    "/app/productos/33333333-3333-4333-8333-333333333333",
  );
});

test("el menú de la fila ofrece entrada, salida y ajuste, y abre el formulario", async () => {
  renderTable([row()]);
  await userEvent.click(screen.getAllByRole("button", { name: /Acciones para PEAD virgen/ })[0]!);
  expect(await screen.findByRole("menuitem", { name: "Entrada manual" })).toBeVisible();
  expect(screen.getByRole("menuitem", { name: "Salida manual" })).toBeVisible();
  await userEvent.click(screen.getByRole("menuitem", { name: "Ajuste por conteo" }));
  expect(await screen.findByRole("heading", { name: /Ajuste por conteo/ })).toBeVisible();
});

test("en la demo el menú también abre los formularios (no guardan)", async () => {
  renderTable([row()], null, "demo");
  await userEvent.click(screen.getAllByRole("button", { name: /Acciones para PEAD virgen/ })[0]!);
  await userEvent.click(await screen.findByRole("menuitem", { name: "Entrada manual" }));
  expect(await screen.findByRole("button", { name: "No disponible en la demo" })).toBeDisabled();
});

test("sin ítems explica qué hacer", () => {
  renderTable([]);
  expect(screen.getByText(/no hay ítems/i)).toBeVisible();
});
