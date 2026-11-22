// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { updatePassword } from "@/features/auth/actions";
import { ResetForm } from "@/features/auth/components/reset-form";

vi.mock("@/features/auth/actions", () => ({ updatePassword: vi.fn() }));

beforeEach(() => vi.mocked(updatePassword).mockReset());

test("valida la contraseña antes de enviar", async () => {
  render(<ResetForm />);
  await userEvent.type(screen.getByLabelText("Nueva contraseña"), "corta");
  await userEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }));
  expect(await screen.findByText("Usá al menos 8 caracteres")).toBeInTheDocument();
  expect(updatePassword).not.toHaveBeenCalled();
});

test("con datos válidos llama a updatePassword y muestra el error si falla", async () => {
  vi.mocked(updatePassword).mockResolvedValue({
    ok: false,
    error: "El enlace venció o ya se usó. Pedí uno nuevo.",
  });
  render(<ResetForm />);
  await userEvent.type(screen.getByLabelText("Nueva contraseña"), "fabrica2026");
  await userEvent.type(screen.getByLabelText("Repetí la contraseña"), "fabrica2026");
  await userEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }));
  expect(updatePassword).toHaveBeenCalledWith({ password: "fabrica2026", confirm: "fabrica2026" });
  expect(await screen.findByRole("alert")).toHaveTextContent("El enlace venció o ya se usó");
});
