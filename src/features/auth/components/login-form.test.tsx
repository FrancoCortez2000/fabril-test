// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LoginForm } from "@/features/auth/components/login-form";

vi.mock("sonner", () => ({ toast: { info: vi.fn() } }));

test("al enviar vacío muestra los errores de email y de contraseña", async () => {
  render(<LoginForm />);
  await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
  expect(await screen.findByText("Ingresá un email válido")).toBeInTheDocument();
  expect(await screen.findByText("Ingresá tu contraseña")).toBeInTheDocument();
});
