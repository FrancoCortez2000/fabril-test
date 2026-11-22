// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { inviteMember } from "@/features/members/actions";
import { InviteDialog } from "@/features/members/components/invite-dialog";

vi.mock("@/features/members/actions", () => ({ inviteMember: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

async function openAndFill() {
  await userEvent.click(screen.getByRole("button", { name: "Invitar usuario" }));
  await userEvent.type(await screen.findByLabelText("Nombre y apellido"), "Carla Ruiz");
  await userEvent.type(screen.getByLabelText("Email"), "carla@fabrica.com");
  await userEvent.click(screen.getByRole("button", { name: "Generar invitación" }));
}

test("muestra el enlace de invitación y lo copia", async () => {
  const user = userEvent.setup();
  const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  const url = "http://localhost:3000/auth/confirm?token_hash=abc&type=invite&next=/restablecer";
  vi.mocked(inviteMember).mockResolvedValue({
    ok: true,
    data: { inviteUrl: url, existing: false },
  });
  render(<InviteDialog />);
  await openAndFill();

  expect(inviteMember).toHaveBeenCalledWith({ fullName: "Carla Ruiz", email: "carla@fabrica.com" });
  expect(await screen.findByDisplayValue(url)).toBeInTheDocument();
  expect(screen.getByText(/vence en 24 horas/i)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Copiar enlace" }));
  expect(writeText).toHaveBeenCalledWith(url);
});

test("si el usuario ya existía avisa que puede entrar con su contraseña", async () => {
  vi.mocked(inviteMember).mockResolvedValue({
    ok: true,
    data: { inviteUrl: null, existing: true },
  });
  render(<InviteDialog />);
  await openAndFill();
  expect(await screen.findByRole("status")).toHaveTextContent(
    "ya puede entrar a esta fábrica con su contraseña",
  );
});

test("un error del servidor se muestra en el formulario", async () => {
  vi.mocked(inviteMember).mockResolvedValue({
    ok: false,
    error: "Ese email ya tiene acceso a esta fábrica",
  });
  render(<InviteDialog />);
  await openAndFill();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Ese email ya tiene acceso a esta fábrica",
  );
});
