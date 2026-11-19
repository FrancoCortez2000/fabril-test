// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BomCalculator } from "@/features/marketing/components/bom-calculator";

const n = (s: string | null) => (s ?? "").replace(/[  ]/g, " ");

function polyetyleneRow() {
  return screen.getByRole("row", { name: /Polietileno AD/ });
}

test("con 1.000 bidones avisa el faltante de polietileno", () => {
  render(<BomCalculator />);
  expect(n(within(polyetyleneRow()).getAllByRole("cell")[0]!.textContent)).toBe("257,5 kg");
  expect(n(screen.getByRole("status").textContent)).toContain("Faltan 57,5 kg de Polietileno AD");
});

test("recalcula mientras se escribe, sin salir del campo", async () => {
  render(<BomCalculator />);
  const input = screen.getByLabelText("Cantidad a fabricar");
  await userEvent.clear(input);
  await userEvent.type(input, "2000");
  expect(n(within(polyetyleneRow()).getAllByRole("cell")[0]!.textContent)).toBe("515 kg");
});

test("sin faltantes confirma que alcanza el material", async () => {
  render(<BomCalculator />);
  const input = screen.getByLabelText("Cantidad a fabricar");
  await userEvent.clear(input);
  await userEvent.type(input, "500");
  await userEvent.tab();
  expect(screen.getByRole("status").textContent).toContain("Hay material suficiente");
});

test.each([["abc"], ["-5"], ["2,5"], ["2000000"]])(
  "una cantidad inválida (%s) pide corregirla",
  async (value) => {
    render(<BomCalculator />);
    const input = screen.getByLabelText("Cantidad a fabricar");
    await userEvent.clear(input);
    await userEvent.type(input, value);
    expect(screen.getByRole("status").textContent).toContain(
      "Ingresá una cantidad entera entre 1 y 1.000.000",
    );
  },
);
