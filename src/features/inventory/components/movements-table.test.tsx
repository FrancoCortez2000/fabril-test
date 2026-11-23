// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { TableParams } from "@/components/data-table/params";
import { AccessProvider } from "@/components/layout/access-provider";
import { MovementsTable } from "@/features/inventory/components/movements-table";
import { movement } from "@/features/items/test-fixtures";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace, push: vi.fn() }),
  usePathname: () => "/app/inventario/movimientos",
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/inventory/actions", () => ({ reverseMovement: vi.fn() }));

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => replace.mockClear());

const params: TableParams = {
  page: 1,
  pageSize: 25,
  sort: { id: "occurredAt", desc: true },
  q: "",
  filters: {},
};

const ITEMS = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "PEAD",
    sku: "PEAD",
    type: "raw_material" as const,
  },
];

function renderTable(
  rows = [movement()],
  role: "admin" | null = "admin",
  mode: "member" | "demo" = "member",
  over: Partial<TableParams> = {},
) {
  return render(
    <AccessProvider role={role} mode={mode}>
      <MovementsTable
        rows={rows}
        total={rows.length}
        params={{ ...params, ...over }}
        items={ITEMS}
      />
    </AccessProvider>,
  );
}

test("muestra fecha, ítem, tipo, cantidad con signo, saldo y documento", () => {
  renderTable([
    movement(),
    movement({
      id: "m2",
      type: "production_consumption",
      quantity: -25.8,
      balanceAfter: 74.2,
      reference: "OP-2026-0001",
    }),
  ]);
  expect(screen.getAllByText("Compra recibida").length).toBeGreaterThan(0);
  expect(screen.getAllByText("+100 kg").length).toBeGreaterThan(0);
  expect(screen.getAllByText("-25,8 kg").length).toBeGreaterThan(0);
  expect(screen.getAllByText("74,2 kg").length).toBeGreaterThan(0);
  expect(screen.getAllByText("OC-2026-0001").length).toBeGreaterThan(0);
  expect(screen.getAllByText("OP-2026-0001").length).toBeGreaterThan(0);
});

test("el ítem enlaza a su ficha según su tipo", () => {
  renderTable();
  expect(screen.getAllByRole("link", { name: /PEAD/ })[0]).toHaveAttribute(
    "href",
    "/app/materias-primas/11111111-1111-4111-8111-111111111111",
  );
});

test("sólo las filas reversibles ofrecen Revertir", () => {
  renderTable([
    movement({ id: "m1", type: "manual_in", reference: null, reversible: true }),
    movement({ id: "m2", reversible: false }),
    movement({ id: "m3", type: "manual_in", reversible: false, reversed: true }),
  ]);
  // Un solo movimiento es reversible; aparece una vez en la tabla y otra en la tarjeta móvil.
  expect(screen.getAllByRole("button", { name: /Revertir/ })).toHaveLength(2);
  expect(screen.getAllByText("Revertido").length).toBeGreaterThan(0);
});

test("Revertir abre el diálogo con el motivo obligatorio", async () => {
  renderTable([movement({ type: "manual_in", reference: null, reversible: true })]);
  await userEvent.click(screen.getAllByRole("button", { name: /Revertir/ })[0]!);
  expect(await screen.findByRole("heading", { name: "Revertir movimiento" })).toBeVisible();
  expect(screen.getByLabelText(/Motivo/)).toBeVisible();
});

test("en la demo se puede abrir el diálogo pero confirmar queda bloqueado", async () => {
  renderTable([movement({ type: "manual_in", reference: null, reversible: true })], null, "demo");
  await userEvent.click(screen.getAllByRole("button", { name: /Revertir/ })[0]!);
  expect(await screen.findByRole("button", { name: "No disponible en la demo" })).toBeDisabled();
});

test("las fechas desde y hasta actualizan la URL conservando el resto", async () => {
  renderTable([movement()], "admin", "member", { q: "pead" });
  const from = screen.getByLabelText("Desde");
  await userEvent.type(from, "2026-10-01");
  await vi.waitFor(() => expect(replace).toHaveBeenCalled());
  const url = String(replace.mock.calls.at(-1)?.[0]);
  expect(url).toContain("desde=2026-10-01");
  expect(url).toContain("q=pead");
});

test("sin movimientos muestra un estado vacío", () => {
  renderTable([]);
  expect(screen.getByText(/no hay movimientos/i)).toBeVisible();
});
