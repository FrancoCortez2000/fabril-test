// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { requestPasswordReset } from "@/features/auth/actions";
import { RecoverForm } from "@/features/auth/components/recover-form";

vi.mock("@/features/auth/actions", () => ({ requestPasswordReset: vi.fn() }));

test("tras enviar muestra un mensaje neutro que no revela si el email existe", async () => {
  vi.mocked(requestPasswordReset).mockResolvedValue({ ok: true, data: null });
  render(<RecoverForm />);
  await userEvent.type(screen.getByLabelText("Email de tu cuenta"), "nadie@x.com");
  await userEvent.click(screen.getByRole("button", { name: "Enviar enlace" }));

  expect(requestPasswordReset).toHaveBeenCalledWith({ email: "nadie@x.com" });
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Si el email está registrado, te enviamos un enlace para elegir una nueva contraseña",
  );
});

test("un error del servidor se muestra como alerta", async () => {
  vi.mocked(requestPasswordReset).mockResolvedValue({
    ok: false,
    error: "No pudimos completar la operación. Probá de nuevo.",
  });
  render(<RecoverForm />);
  await userEvent.type(screen.getByLabelText("Email de tu cuenta"), "ana@x.com");
  await userEvent.click(screen.getByRole("button", { name: "Enviar enlace" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos completar la operación");
});
