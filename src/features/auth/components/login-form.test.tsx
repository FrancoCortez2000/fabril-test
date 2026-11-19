// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { signIn } from "@/features/auth/actions";
import { LoginForm } from "@/features/auth/components/login-form";

vi.mock("@/features/auth/actions", () => ({ signIn: vi.fn() }));
let search = "";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(search) }));

beforeEach(() => {
  vi.mocked(signIn).mockReset();
  search = "";
});

test("al enviar vacío muestra los errores de email y de contraseña", async () => {
  render(<LoginForm />);
  await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
  expect(await screen.findByText("Ingresá un email válido")).toBeInTheDocument();
  expect(await screen.findByText("Ingresá tu contraseña")).toBeInTheDocument();
  expect(signIn).not.toHaveBeenCalled();
});

test("envía las credenciales con la ruta de destino y muestra el error del servidor", async () => {
  search = "next=%2Fapp%2Fproductos";
  vi.mocked(signIn).mockResolvedValue({ ok: false, error: "El email o la contraseña no son correctos" });
  render(<LoginForm />);
  await userEvent.type(screen.getByLabelText("Email"), "ana@fabrica.com");
  await userEvent.type(screen.getByLabelText("Contraseña"), "secreto123");
  await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));

  expect(signIn).toHaveBeenCalledWith({ email: "ana@fabrica.com", password: "secreto123", next: "/app/productos" });
  expect(await screen.findByRole("alert")).toHaveTextContent("El email o la contraseña no son correctos");
  expect(screen.getByLabelText("Email")).toHaveValue("ana@fabrica.com");
});

test("un enlace vencido se informa al llegar", () => {
  search = "error=enlace";
  render(<LoginForm />);
  expect(screen.getByRole("alert")).toHaveTextContent("El enlace venció o ya se usó");
});
