// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AccessProvider } from "@/components/layout/access-provider";
import { resetDemoData } from "@/features/settings/actions";
import { DemoReset } from "@/features/settings/components/demo-reset";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/settings/actions", () => ({
  saveGeneralSettings: vi.fn(),
  resetDemoData: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(resetDemoData).mockReset();
  refresh.mockClear();
});

const renderReset = (role: "admin" | null = "admin") =>
  render(
    <AccessProvider role={role} mode="member">
      <DemoReset />
    </AccessProvider>,
  );

test("pide confirmación antes de restablecer y avisa qué pasa con los datos", async () => {
  renderReset();
  await userEvent.click(screen.getByRole("button", { name: "Restablecer datos demo" }));
  expect(await screen.findByText(/se borran/i)).toBeVisible();
  expect(resetDemoData).not.toHaveBeenCalled();
});

test("confirmar restablece, avisa y refresca", async () => {
  vi.mocked(resetDemoData).mockResolvedValue({ ok: true, data: null });
  renderReset();
  await userEvent.click(screen.getByRole("button", { name: "Restablecer datos demo" }));
  await userEvent.click(await screen.findByRole("button", { name: "Restablecer" }));
  await vi.waitFor(() => expect(resetDemoData).toHaveBeenCalledWith({}));
  await vi.waitFor(() => expect(refresh).toHaveBeenCalled());
});

test("si falla, avisa y no refresca", async () => {
  vi.mocked(resetDemoData).mockResolvedValue({ ok: false, error: "No pudimos" });
  renderReset();
  await userEvent.click(screen.getByRole("button", { name: "Restablecer datos demo" }));
  await userEvent.click(await screen.findByRole("button", { name: "Restablecer" }));
  await vi.waitFor(() => expect(resetDemoData).toHaveBeenCalled());
  expect(refresh).not.toHaveBeenCalled();
});

test("sin permiso el botón queda deshabilitado", () => {
  renderReset(null);
  expect(screen.getByRole("button", { name: "Restablecer datos demo" })).toBeDisabled();
});
