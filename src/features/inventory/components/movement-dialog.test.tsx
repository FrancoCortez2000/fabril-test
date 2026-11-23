// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AccessProvider } from "@/components/layout/access-provider";
import { registerMovement } from "@/features/inventory/actions";
import { MovementDialog } from "@/features/inventory/components/movement-dialog";
import type { StockRow } from "@/features/inventory/queries";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/inventory/actions", () => ({
  registerMovement: vi.fn(),
  registerAdjustment: vi.fn(),
}));

const ITEM: StockRow = {
  itemId: "11111111-1111-4111-8111-111111111111",
  type: "raw_material",
  sku: "PEAD",
  name: "PEAD",
  categoryName: "Resinas",
  unitCode: "kg",
  minStock: 500,
  physical: 300,
  committed: 20,
  available: 280,
  avgCost: 1000,
  value: 300000,
  level: "low",
};

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  vi.mocked(registerMovement).mockReset();
  refresh.mockClear();
});

function open(
  type: "manual_in" | "manual_out",
  role: "admin" | null = "admin",
  mode: "member" | "demo" = "member",
  onOpenChange = vi.fn(),
) {
  render(
    <AccessProvider role={role} mode={mode}>
      <MovementDialog open onOpenChange={onOpenChange} item={ITEM} type={type} />
    </AccessProvider>,
  );
  return onOpenChange;
}

test("la entrada pide cantidad, costo unitario y motivo, y muestra el ítem", () => {
  open("manual_in");
  expect(screen.getByRole("heading", { name: /Entrada manual/ })).toBeVisible();
  expect(screen.getByText(/PEAD/)).toBeVisible();
  expect(screen.getByLabelText(/Cantidad/)).toBeVisible();
  expect(screen.getByLabelText(/Costo unitario/)).toBeVisible();
  expect(screen.getByLabelText(/Motivo/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Registrar entrada" })).toBeVisible();
});

test("la salida no pide costo y muestra el stock disponible", () => {
  open("manual_out");
  expect(screen.getByRole("heading", { name: /Salida manual/ })).toBeVisible();
  expect(screen.queryByLabelText(/Costo unitario/)).toBeNull();
  expect(screen.getByText(/Disponible: 280 kg/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Registrar salida" })).toBeVisible();
});

test("sin motivo no se envía y lo explica", async () => {
  open("manual_in");
  await userEvent.type(screen.getByLabelText(/Cantidad/), "10");
  await userEvent.click(screen.getByRole("button", { name: "Registrar entrada" }));
  expect(await screen.findByText("Indicá el motivo del movimiento")).toBeVisible();
  expect(registerMovement).not.toHaveBeenCalled();
});

test("guarda una entrada con costo, avisa, cierra y refresca", async () => {
  vi.mocked(registerMovement).mockResolvedValue({ ok: true, data: { id: "m1" } as never });
  const onOpenChange = open("manual_in");
  await userEvent.type(screen.getByLabelText(/Cantidad/), "10");
  await userEvent.type(screen.getByLabelText(/Costo unitario/), "55");
  await userEvent.type(screen.getByLabelText(/Motivo/), "Conteo físico");
  await userEvent.click(screen.getByRole("button", { name: "Registrar entrada" }));
  await vi.waitFor(() => expect(registerMovement).toHaveBeenCalledTimes(1));
  expect(registerMovement).toHaveBeenCalledWith({
    itemId: ITEM.itemId,
    type: "manual_in",
    quantity: 10,
    unitCost: 55,
    reason: "Conteo físico",
  });
  await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  expect(refresh).toHaveBeenCalled();
});

test("una salida se envía sin costo", async () => {
  vi.mocked(registerMovement).mockResolvedValue({ ok: true, data: { id: "m1" } as never });
  open("manual_out");
  await userEvent.type(screen.getByLabelText(/Cantidad/), "4");
  await userEvent.type(screen.getByLabelText(/Motivo/), "Rotura");
  await userEvent.click(screen.getByRole("button", { name: "Registrar salida" }));
  await vi.waitFor(() => expect(registerMovement).toHaveBeenCalledTimes(1));
  expect(registerMovement).toHaveBeenCalledWith({
    itemId: ITEM.itemId,
    type: "manual_out",
    quantity: 4,
    unitCost: null,
    reason: "Rotura",
  });
});

test("si el servidor rechaza (p. ej. sin stock), muestra el motivo y deja el diálogo abierto", async () => {
  vi.mocked(registerMovement).mockResolvedValue({
    ok: false,
    error: "No hay stock suficiente de PEAD: faltan 5 kg",
  });
  const onOpenChange = open("manual_out");
  await userEvent.type(screen.getByLabelText(/Cantidad/), "400");
  await userEvent.type(screen.getByLabelText(/Motivo/), "Rotura");
  await userEvent.click(screen.getByRole("button", { name: "Registrar salida" }));
  expect(await screen.findByText(/No hay stock suficiente de PEAD/)).toBeVisible();
  expect(onOpenChange).not.toHaveBeenCalledWith(false);
  expect(refresh).not.toHaveBeenCalled();
});

test("en la demo se puede completar pero registrar queda bloqueado", async () => {
  open("manual_in", null, "demo");
  await userEvent.type(screen.getByLabelText(/Cantidad/), "10");
  expect(screen.getByRole("button", { name: "No disponible en la demo" })).toBeDisabled();
  expect(registerMovement).not.toHaveBeenCalled();
});
