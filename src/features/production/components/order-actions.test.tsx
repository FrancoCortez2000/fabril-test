// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AccessProvider } from "@/components/layout/access-provider";
import { startOrder } from "@/features/production/actions";
import { OrderActions } from "@/features/production/components/order-actions";
import { materials, OP_ID, orderFull } from "@/features/production/test-fixtures";
import type { OrderMaterial, ProductionStatus } from "@/features/production/types";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/production/actions", () => ({
  startOrder: vi.fn(),
  reportProgress: vi.fn(),
  completeOrder: vi.fn(),
  cancelOrder: vi.fn(),
  createPurchaseFromShortages: vi.fn(),
}));

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
});

beforeEach(() => {
  vi.mocked(startOrder).mockReset();
  refresh.mockClear();
});

const SUPPLIERS = [{ id: "22222222-2222-4222-8222-222222222222", name: "Petroquímica Sur" }];
const SHORT: OrderMaterial[] = [{ ...materials[0]!, available: -5 }, materials[1]!];

function renderActions(
  status: ProductionStatus,
  opts: {
    role?: "admin" | null;
    mode?: "member" | "demo";
    materials?: OrderMaterial[];
  } = {},
) {
  const { role = "admin", mode = "member", materials: mats = materials } = opts;
  return render(
    <AccessProvider role={role} mode={mode}>
      <OrderActions order={orderFull({ status })} materials={mats} suppliers={SUPPLIERS} />
    </AccessProvider>,
  );
}

const buttons = () => screen.queryAllByRole("button").map((b) => b.textContent?.trim());

describe("botones por estado", () => {
  test.each([
    ["planned", ["Iniciar", "Cancelar orden"]],
    ["in_progress", ["Registrar avance", "Completar", "Cancelar orden"]],
    ["quality_check", ["Completar", "Cancelar orden"]],
    ["completed", []],
    ["cancelled", []],
  ] as const)("%s", (status, expected) => {
    renderActions(status);
    expect(buttons()).toEqual(expected);
  });

  test("una orden planificada con faltantes ofrece crear la compra", () => {
    renderActions("planned", { materials: SHORT });
    expect(buttons()).toEqual(["Iniciar", "Crear compra con faltantes", "Cancelar orden"]);
  });

  test("sólo las planificadas ofrecen crear la compra aunque haya faltantes", () => {
    renderActions("in_progress", { materials: SHORT });
    expect(buttons()).not.toContain("Crear compra con faltantes");
  });
});

test("iniciar pide confirmación y llama a la acción", async () => {
  vi.mocked(startOrder).mockResolvedValue({ ok: true, data: null });
  renderActions("planned");
  await userEvent.click(screen.getByRole("button", { name: "Iniciar" }));
  await userEvent.click(await screen.findByRole("button", { name: "Iniciar producción" }));
  await vi.waitFor(() => expect(startOrder).toHaveBeenCalledWith({ id: OP_ID }));
  await vi.waitFor(() => expect(refresh).toHaveBeenCalled());
});

test("si iniciar falla (p. ej. falta stock) no refresca", async () => {
  vi.mocked(startOrder).mockResolvedValue({
    ok: false,
    error: "No hay stock suficiente para iniciar: PEAD faltan 5 kg",
  });
  renderActions("planned");
  await userEvent.click(screen.getByRole("button", { name: "Iniciar" }));
  await userEvent.click(await screen.findByRole("button", { name: "Iniciar producción" }));
  await vi.waitFor(() => expect(startOrder).toHaveBeenCalled());
  expect(refresh).not.toHaveBeenCalled();
});

test("cada botón abre su formulario", async () => {
  renderActions("in_progress");
  await userEvent.click(screen.getByRole("button", { name: "Registrar avance" }));
  expect(await screen.findByRole("heading", { name: "Registrar avance" })).toBeVisible();
});

describe("en la demo", () => {
  test("Iniciar queda deshabilitado con explicación", () => {
    renderActions("planned", { role: null, mode: "demo" });
    expect(screen.getByRole("button", { name: "Iniciar" })).toBeDisabled();
  });

  test("los formularios abren pero no guardan", async () => {
    renderActions("in_progress", { role: null, mode: "demo" });
    await userEvent.click(screen.getByRole("button", { name: "Completar" }));
    expect(await screen.findByRole("button", { name: "No disponible en la demo" })).toBeDisabled();
  });
});
