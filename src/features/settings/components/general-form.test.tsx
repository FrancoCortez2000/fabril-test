// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AccessProvider } from "@/components/layout/access-provider";
import { GeneralForm } from "@/features/settings/components/general-form";
import { saveGeneralSettings } from "@/features/settings/actions";
import type { GeneralSettingsValues } from "@/features/settings/schemas";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/settings/actions", () => ({
  saveGeneralSettings: vi.fn(),
  resetDemoData: vi.fn(),
}));

const values: GeneralSettingsValues = {
  name: "Plásticos Sur",
  legalName: "",
  cuit: "30-71234567-9",
  address: "",
  city: "Rosario",
  province: "Santa Fe",
  phone: "",
  email: "",
  timezone: "America/Argentina/Buenos_Aires",
  defaultWastePct: 3,
  defaultLaborRate: 6000,
  allowNegativeStock: false,
};

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  vi.mocked(saveGeneralSettings).mockReset();
  refresh.mockClear();
});

const renderForm = (role: "admin" | null = "admin") =>
  render(
    <AccessProvider role={role} mode="member">
      <GeneralForm initialValues={values} />
    </AccessProvider>,
  );

test("muestra los datos actuales de la fábrica", () => {
  renderForm();
  expect(screen.getByLabelText("Nombre")).toHaveValue("Plásticos Sur");
  expect(screen.getByLabelText(/^CUIT/)).toHaveValue("30-71234567-9");
  expect(screen.getByLabelText("Zona horaria")).toHaveValue("America/Argentina/Buenos_Aires");
  expect(screen.getByLabelText(/Desperdicio por defecto/)).toHaveValue("3");
});

test("guarda los cambios, avisa y refresca", async () => {
  vi.mocked(saveGeneralSettings).mockResolvedValue({ ok: true, data: null });
  renderForm();
  const city = screen.getByLabelText(/^Ciudad/);
  await userEvent.clear(city);
  await userEvent.type(city, "Córdoba");
  await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  await vi.waitFor(() => expect(saveGeneralSettings).toHaveBeenCalledTimes(1));
  expect(saveGeneralSettings).toHaveBeenCalledWith({ ...values, city: "Córdoba" });
  await vi.waitFor(() => expect(refresh).toHaveBeenCalled());
});

test("un CUIT mal formado bloquea el envío y lo explica", async () => {
  renderForm();
  const cuit = screen.getByLabelText(/^CUIT/);
  await userEvent.clear(cuit);
  await userEvent.type(cuit, "123");
  await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  expect(await screen.findByText("El CUIT tiene que tener el formato 30-12345678-9")).toBeVisible();
  expect(saveGeneralSettings).not.toHaveBeenCalled();
});

test("si el servidor rechaza (zona horaria inválida), muestra el motivo y no refresca", async () => {
  vi.mocked(saveGeneralSettings).mockResolvedValue({ ok: false, error: "Zona horaria inválida" });
  renderForm();
  await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  expect(await screen.findByText("Zona horaria inválida")).toBeVisible();
  expect(refresh).not.toHaveBeenCalled();
});

test("permitir stock negativo se puede activar", async () => {
  vi.mocked(saveGeneralSettings).mockResolvedValue({ ok: true, data: null });
  renderForm();
  await userEvent.click(screen.getByRole("checkbox", { name: /Permitir stock negativo/ }));
  await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  await vi.waitFor(() =>
    expect(saveGeneralSettings).toHaveBeenCalledWith(
      expect.objectContaining({ allowNegativeStock: true }),
    ),
  );
});

test("sin permiso el botón queda deshabilitado", () => {
  renderForm(null);
  expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
});
