// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AccessProvider } from "@/components/layout/access-provider";
import { registerAdjustment } from "@/features/inventory/actions";
import { AdjustmentDialog } from "@/features/inventory/components/adjustment-dialog";
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
  categoryName: null,
  unitCode: "kg",
  minStock: 500,
  physical: 300,
  committed: 0,
  available: 300,
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
  vi.mocked(registerAdjustment).mockReset();
  refresh.mockClear();
});

function open(role: "admin" | null = "admin", mode: "member" | "demo" = "member") {
  const onOpenChange = vi.fn();
  render(
    <AccessProvider role={role} mode={mode}>
      <AdjustmentDialog open onOpenChange={onOpenChange} item={ITEM} />
    </AccessProvider>,
  );
  return onOpenChange;
}

test("muestra el stock del sistema y pide el conteo físico y el motivo", () => {
  open();
  expect(screen.getByRole("heading", { name: /Ajuste por conteo/ })).toBeVisible();
  expect(screen.getByText(/Stock en el sistema: 300 kg/)).toBeVisible();
  expect(screen.getByLabelText(/Cantidad contada/)).toBeVisible();
  expect(screen.getByLabelText(/Motivo/)).toBeVisible();
});

test("avisa la diferencia que va a ajustar", async () => {
  open();
  await userEvent.type(screen.getByLabelText(/Cantidad contada/), "280");
  expect(await screen.findByText(/Diferencia: -20 kg/)).toBeVisible();
});

test("guarda el conteo, avisa, cierra y refresca", async () => {
  vi.mocked(registerAdjustment).mockResolvedValue({ ok: true, data: { id: "m1" } as never });
  const onOpenChange = open();
  await userEvent.type(screen.getByLabelText(/Cantidad contada/), "280");
  await userEvent.type(screen.getByLabelText(/Motivo/), "Conteo de fin de mes");
  await userEvent.click(screen.getByRole("button", { name: "Registrar ajuste" }));
  await vi.waitFor(() => expect(registerAdjustment).toHaveBeenCalledTimes(1));
  expect(registerAdjustment).toHaveBeenCalledWith({
    itemId: ITEM.itemId,
    countedQty: 280,
    reason: "Conteo de fin de mes",
  });
  await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  expect(refresh).toHaveBeenCalled();
});

test("un conteo en cero es válido", async () => {
  vi.mocked(registerAdjustment).mockResolvedValue({ ok: true, data: { id: "m1" } as never });
  open();
  await userEvent.type(screen.getByLabelText(/Cantidad contada/), "0");
  await userEvent.type(screen.getByLabelText(/Motivo/), "Se agotó");
  await userEvent.click(screen.getByRole("button", { name: "Registrar ajuste" }));
  await vi.waitFor(() =>
    expect(registerAdjustment).toHaveBeenCalledWith(expect.objectContaining({ countedQty: 0 })),
  );
});

test("sin motivo no se envía", async () => {
  open();
  await userEvent.type(screen.getByLabelText(/Cantidad contada/), "280");
  await userEvent.click(screen.getByRole("button", { name: "Registrar ajuste" }));
  expect(await screen.findByText("Indicá el motivo del ajuste")).toBeVisible();
  expect(registerAdjustment).not.toHaveBeenCalled();
});

test("si el servidor rechaza, muestra el motivo", async () => {
  vi.mocked(registerAdjustment).mockResolvedValue({ ok: false, error: "No pudimos" });
  open();
  await userEvent.type(screen.getByLabelText(/Cantidad contada/), "280");
  await userEvent.type(screen.getByLabelText(/Motivo/), "Conteo de fin de mes");
  await userEvent.click(screen.getByRole("button", { name: "Registrar ajuste" }));
  expect(await screen.findByText("No pudimos")).toBeVisible();
  expect(refresh).not.toHaveBeenCalled();
});

test("en la demo registrar queda bloqueado", () => {
  open(null, "demo");
  expect(screen.getByRole("button", { name: "No disponible en la demo" })).toBeDisabled();
});
