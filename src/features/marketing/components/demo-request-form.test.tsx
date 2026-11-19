// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { submitDemoRequest } from "@/features/marketing/actions";
import { DemoRequestForm } from "@/features/marketing/components/demo-request-form";

vi.mock("@/features/marketing/actions", () => ({ submitDemoRequest: vi.fn() }));

async function fill() {
  await userEvent.type(screen.getByLabelText("Nombre y apellido"), "Laura Benítez");
  await userEvent.type(screen.getByLabelText("Empresa"), "Plásticos SA");
  await userEvent.type(screen.getByLabelText("Email"), "laura@plasticos.com");
  await userEvent.click(screen.getByRole("button", { name: "Solicitar demostración" }));
}

test("al enviar guarda la solicitud y confirma con el email de contacto", async () => {
  vi.mocked(submitDemoRequest).mockResolvedValue({ ok: true, data: null });
  render(<DemoRequestForm />);
  await fill();
  expect(submitDemoRequest).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "Laura Benítez",
      company: "Plásticos SA",
      email: "laura@plasticos.com",
      website: "",
    }),
  );
  const status = await screen.findByRole("status");
  expect(status).toHaveTextContent("Recibimos tu solicitud");
  expect(status).toHaveTextContent("laura@plasticos.com");
});

test("el límite de envíos se informa", async () => {
  vi.mocked(submitDemoRequest).mockResolvedValue({
    ok: false,
    error: "Recibimos varias solicitudes desde tu conexión. Probá de nuevo en un rato.",
  });
  render(<DemoRequestForm />);
  await fill();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Recibimos varias solicitudes desde tu conexión",
  );
});
