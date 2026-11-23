// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AccessProvider } from "@/components/layout/access-provider";
import { reverseMovement } from "@/features/inventory/actions";
import { ReverseDialog } from "@/features/inventory/components/reverse-dialog";
import { movement } from "@/features/items/test-fixtures";

const MOVEMENT_ID = "11111111-1111-4111-8111-111111111111";
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/inventory/actions", () => ({ reverseMovement: vi.fn() }));

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  vi.mocked(reverseMovement).mockReset();
  refresh.mockClear();
});

function open(role: "admin" | null = "admin", mode: "member" | "demo" = "member") {
  const onOpenChange = vi.fn();
  render(
    <AccessProvider role={role} mode={mode}>
      <ReverseDialog
        open
        onOpenChange={onOpenChange}
        movement={movement({
          id: MOVEMENT_ID,
          type: "manual_in",
          reference: null,
          reversible: true,
        })}
      />
    </AccessProvider>,
  );
  return onOpenChange;
}

test("explica qué movimiento se revierte", () => {
  open();
  expect(screen.getByRole("heading", { name: "Revertir movimiento" })).toBeVisible();
  expect(screen.getByText(/Entrada manual/)).toBeVisible();
  expect(screen.getByText(/\+100 kg/)).toBeVisible();
});

test("sin motivo no se envía", async () => {
  open();
  await userEvent.click(screen.getByRole("button", { name: "Revertir" }));
  expect(await screen.findByText("Indicá el motivo de la reversión")).toBeVisible();
  expect(reverseMovement).not.toHaveBeenCalled();
});

test("revierte con el motivo, avisa, cierra y refresca", async () => {
  vi.mocked(reverseMovement).mockResolvedValue({ ok: true, data: { id: "r1" } as never });
  const onOpenChange = open();
  await userEvent.type(screen.getByLabelText(/Motivo/), "Error de carga");
  await userEvent.click(screen.getByRole("button", { name: "Revertir" }));
  await vi.waitFor(() =>
    expect(reverseMovement).toHaveBeenCalledWith({
      movementId: MOVEMENT_ID,
      reason: "Error de carga",
    }),
  );
  await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  expect(refresh).toHaveBeenCalled();
});

test("si el servidor rechaza, muestra el motivo y no cierra", async () => {
  vi.mocked(reverseMovement).mockResolvedValue({
    ok: false,
    error: "El movimiento ya fue revertido",
  });
  const onOpenChange = open();
  await userEvent.type(screen.getByLabelText(/Motivo/), "Error de carga");
  await userEvent.click(screen.getByRole("button", { name: "Revertir" }));
  expect(await screen.findByText("El movimiento ya fue revertido")).toBeVisible();
  expect(onOpenChange).not.toHaveBeenCalledWith(false);
  expect(refresh).not.toHaveBeenCalled();
});

test("en la demo confirmar queda bloqueado", () => {
  open(null, "demo");
  expect(screen.getByRole("button", { name: "No disponible en la demo" })).toBeDisabled();
});
