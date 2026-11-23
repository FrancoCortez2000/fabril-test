// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AccessProvider } from "@/components/layout/access-provider";
import { cancelPurchase, confirmPurchase } from "@/features/purchasing/actions";
import { PurchaseActions } from "@/features/purchasing/components/purchase-actions";
import { lines, PO_ID, purchase } from "@/features/purchasing/test-fixtures";
import type { PurchaseRow } from "@/features/purchasing/types";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/purchasing/actions", () => ({
  receivePurchase: vi.fn(),
  confirmPurchase: vi.fn(),
  cancelPurchase: vi.fn(),
}));

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  vi.mocked(confirmPurchase).mockReset();
  vi.mocked(cancelPurchase).mockReset();
  refresh.mockClear();
});

const renderActions = (
  status: PurchaseRow["status"],
  role: "admin" | null = "admin",
  mode: "member" | "demo" = "member",
) =>
  render(
    <AccessProvider role={role} mode={mode}>
      <PurchaseActions purchase={purchase({ status })} lines={lines} />
    </AccessProvider>,
  );

const buttons = () => screen.queryAllByRole("button").map((b) => b.textContent?.trim());

describe("botones por estado", () => {
  test.each([
    ["draft", ["Confirmar", "Cancelar orden"]],
    ["pending", ["Recibir mercadería", "Cancelar orden"]],
    ["partially_received", ["Recibir mercadería", "Cancelar orden"]],
    ["received", []],
    ["closed", []],
    ["cancelled", []],
  ] as const)("%s", (status, expected) => {
    renderActions(status);
    expect(buttons()).toEqual(expected);
  });
});

test("confirmar pide confirmación y llama a la acción", async () => {
  vi.mocked(confirmPurchase).mockResolvedValue({ ok: true, data: null });
  renderActions("draft");
  await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
  await userEvent.click(await screen.findByRole("button", { name: "Confirmar orden" }));
  await vi.waitFor(() => expect(confirmPurchase).toHaveBeenCalledWith({ id: PO_ID }));
  await vi.waitFor(() => expect(refresh).toHaveBeenCalled());
});

test("si confirmar falla no refresca y el error se informa", async () => {
  vi.mocked(confirmPurchase).mockResolvedValue({
    ok: false,
    error: "La orden ya no está en borrador",
  });
  renderActions("draft");
  await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
  await userEvent.click(await screen.findByRole("button", { name: "Confirmar orden" }));
  await vi.waitFor(() => expect(confirmPurchase).toHaveBeenCalled());
  expect(refresh).not.toHaveBeenCalled();
});

test("cancelar pide el motivo y lo envía", async () => {
  vi.mocked(cancelPurchase).mockResolvedValue({ ok: true, data: null });
  renderActions("pending");
  await userEvent.click(screen.getByRole("button", { name: "Cancelar orden" }));
  await userEvent.click(await screen.findByRole("button", { name: "Cancelar la orden" }));
  expect(await screen.findByText("Indicá el motivo de la cancelación")).toBeVisible();
  expect(cancelPurchase).not.toHaveBeenCalled();
  await userEvent.type(screen.getByLabelText(/Motivo/), "Cambio de proveedor");
  await userEvent.click(screen.getByRole("button", { name: "Cancelar la orden" }));
  await vi.waitFor(() =>
    expect(cancelPurchase).toHaveBeenCalledWith({ id: PO_ID, reason: "Cambio de proveedor" }),
  );
});

test("Recibir abre el formulario de recepción", async () => {
  renderActions("pending");
  await userEvent.click(screen.getByRole("button", { name: "Recibir mercadería" }));
  expect(await screen.findByRole("heading", { name: "Recibir mercadería" })).toBeVisible();
});

describe("en la demo", () => {
  test("Confirmar queda deshabilitado con explicación", () => {
    renderActions("draft", null, "demo");
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  });

  test("Recibir y Cancelar abren sus formularios pero no guardan", async () => {
    renderActions("pending", null, "demo");
    await userEvent.click(screen.getByRole("button", { name: "Recibir mercadería" }));
    expect(await screen.findByRole("button", { name: "No disponible en la demo" })).toBeDisabled();
    expect(cancelPurchase).not.toHaveBeenCalled();
    expect(confirmPurchase).not.toHaveBeenCalled();
  });
});
