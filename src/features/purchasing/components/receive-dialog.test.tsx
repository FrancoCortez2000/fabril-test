// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AccessProvider } from "@/components/layout/access-provider";
import { receivePurchase } from "@/features/purchasing/actions";
import { ReceiveDialog } from "@/features/purchasing/components/receive-dialog";
import { LINE_A, LINE_B, lines, PO_ID, purchase } from "@/features/purchasing/test-fixtures";

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
  vi.mocked(receivePurchase).mockReset();
  refresh.mockClear();
});

function open(
  role: "admin" | null = "admin",
  mode: "member" | "demo" = "member",
  over: Partial<React.ComponentProps<typeof ReceiveDialog>> = {},
) {
  const onOpenChange = vi.fn();
  render(
    <AccessProvider role={role} mode={mode}>
      <ReceiveDialog
        open
        onOpenChange={onOpenChange}
        purchase={purchase()}
        lines={lines}
        {...over}
      />
    </AccessProvider>,
  );
  return onOpenChange;
}

test("precarga lo pendiente de cada línea y deshabilita las ya recibidas", () => {
  open();
  expect(screen.getByRole("heading", { name: "Recibir mercadería" })).toBeVisible();
  expect(screen.getByLabelText(/Cantidad recibida de Masterbatch/)).toHaveValue("100");
  expect(screen.getByLabelText(/Cantidad recibida de PEAD/)).toBeDisabled();
  expect(screen.getByText(/Pendiente: 100 kg/)).toBeVisible();
});

test("guarda sólo las líneas con cantidad, con remito y fecha, avisa y refresca", async () => {
  vi.mocked(receivePurchase).mockResolvedValue({ ok: true, data: { id: "r1" } as never });
  const onOpenChange = open();
  const qty = screen.getByLabelText(/Cantidad recibida de Masterbatch/);
  await userEvent.clear(qty);
  await userEvent.type(qty, "60");
  await userEvent.type(screen.getByLabelText(/Remito/), "0001-00004567");
  await userEvent.click(screen.getByRole("button", { name: "Registrar recepción" }));
  await vi.waitFor(() => expect(receivePurchase).toHaveBeenCalledTimes(1));
  expect(receivePurchase).toHaveBeenCalledWith({
    id: PO_ID,
    deliveryNote: "0001-00004567",
    receivedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    lines: [{ lineId: LINE_B, quantity: 60 }],
  });
  const sent = vi.mocked(receivePurchase).mock.calls[0]?.[0] as { lines: { lineId: string }[] };
  expect(sent.lines.some((l) => l.lineId === LINE_A)).toBe(false);
  await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  expect(refresh).toHaveBeenCalled();
});

test("no deja recibir más de lo pendiente", async () => {
  open();
  const qty = screen.getByLabelText(/Cantidad recibida de Masterbatch/);
  await userEvent.clear(qty);
  await userEvent.type(qty, "150");
  await userEvent.click(screen.getByRole("button", { name: "Registrar recepción" }));
  expect(await screen.findByText(/No podés recibir más de lo pendiente/)).toBeVisible();
  expect(receivePurchase).not.toHaveBeenCalled();
});

test("no deja enviar si todas las cantidades quedan en cero", async () => {
  open();
  const qty = screen.getByLabelText(/Cantidad recibida de Masterbatch/);
  await userEvent.clear(qty);
  await userEvent.type(qty, "0");
  await userEvent.click(screen.getByRole("button", { name: "Registrar recepción" }));
  expect(
    await screen.findByText(/Indicá la cantidad recibida de al menos un material/),
  ).toBeVisible();
  expect(receivePurchase).not.toHaveBeenCalled();
});

test("una unidad entera no admite decimales", async () => {
  open("admin", "member", {
    lines: [{ ...lines[1]!, unitCode: "u", pendingQty: 10, quantity: 10 }],
  });
  const qty = screen.getByLabelText(/Cantidad recibida de Masterbatch/);
  await userEvent.clear(qty);
  await userEvent.type(qty, "2,5");
  await userEvent.click(screen.getByRole("button", { name: "Registrar recepción" }));
  expect(await screen.findByText(/no admite decimales/i)).toBeVisible();
  expect(receivePurchase).not.toHaveBeenCalled();
});

test("si el servidor rechaza, muestra el motivo y no cierra", async () => {
  vi.mocked(receivePurchase).mockResolvedValue({
    ok: false,
    error: "La orden OC-2026-0001 está cancelada",
  });
  const onOpenChange = open();
  await userEvent.click(screen.getByRole("button", { name: "Registrar recepción" }));
  expect(await screen.findByText("La orden OC-2026-0001 está cancelada")).toBeVisible();
  expect(onOpenChange).not.toHaveBeenCalledWith(false);
  expect(refresh).not.toHaveBeenCalled();
});

test("el botón se deshabilita mientras corre la recepción (doble envío)", async () => {
  let release: (v: { ok: true; data: never }) => void = () => {};
  vi.mocked(receivePurchase).mockReturnValue(
    new Promise((resolve) => {
      release = resolve as typeof release;
    }),
  );
  open();
  await userEvent.click(screen.getByRole("button", { name: "Registrar recepción" }));
  await vi.waitFor(() =>
    expect(screen.getByRole("button", { name: /Registrar recepción/ })).toBeDisabled(),
  );
  await userEvent.click(screen.getByRole("button", { name: /Registrar recepción/ }));
  expect(receivePurchase).toHaveBeenCalledTimes(1);
  release({ ok: true, data: { id: "x" } as never });
});

test("en la demo se completa pero registrar queda bloqueado", () => {
  open(null, "demo");
  expect(screen.getByRole("button", { name: "No disponible en la demo" })).toBeDisabled();
  expect(receivePurchase).not.toHaveBeenCalled();
});
