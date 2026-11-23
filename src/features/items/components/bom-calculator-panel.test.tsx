// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BomCalculatorPanel } from "@/features/items/components/bom-calculator-panel";
import type { BomView } from "@/features/items/bom-queries";

const bom: BomView = {
  outputQty: 10,
  defaultWastePct: null,
  orgWastePct: 3,
  notes: null,
  lines: [
    {
      itemId: "a",
      name: "PEAD",
      unitCode: "kg",
      quantity: 5,
      wastePct: null,
      avgCost: 1000,
      available: 280,
    },
    {
      itemId: "b",
      name: "Masterbatch",
      unitCode: "kg",
      quantity: 0.1,
      wastePct: 7,
      avgCost: 8000,
      available: 0.5,
    },
  ],
};

async function setQty(value: string) {
  const input = screen.getByLabelText(/Cantidad a fabricar/);
  await userEvent.clear(input);
  if (value) await userEvent.type(input, value);
}

test("calcula lo requerido con el desperdicio de la fábrica y el propio de cada línea", async () => {
  render(<BomCalculatorPanel bom={bom} productUnit="u" />);
  await setQty("100");
  const pead = screen.getByRole("row", { name: /PEAD/ });
  expect(within(pead).getByText("51,5 kg")).toBeVisible(); // 100 × 5 / 10 × 1,03
  const mb = screen.getByRole("row", { name: /Masterbatch/ });
  expect(within(mb).getByText("1,07 kg")).toBeVisible(); // 100 × 0,1 / 10 × 1,07
});

test("marca el faltante cuando lo disponible no alcanza", async () => {
  render(<BomCalculatorPanel bom={bom} productUnit="u" />);
  await setQty("100");
  const mb = screen.getByRole("row", { name: /Masterbatch/ });
  expect(within(mb).getByText("0,57 kg")).toBeVisible(); // 1,07 − 0,5
  expect(within(mb).getByText(/Falta/)).toBeVisible();
  const pead = screen.getByRole("row", { name: /PEAD/ });
  expect(within(pead).queryByText(/Falta/)).toBeNull();
  expect(screen.getByText(/Falta comprar/)).toBeVisible();
});

test("si alcanza todo lo dice", async () => {
  render(<BomCalculatorPanel bom={bom} productUnit="u" />);
  await setQty("10");
  expect(screen.getByText(/Alcanza con lo que hay disponible/)).toBeVisible();
});

test("con la cantidad vacía, cero o inválida no muestra filas ni NaN", async () => {
  const { container } = render(<BomCalculatorPanel bom={bom} productUnit="u" />);
  for (const value of ["", "0", "abc"]) {
    await setQty(value);
    expect(screen.queryByRole("row", { name: /PEAD/ })).toBeNull();
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
  }
});

test("muestra el costo de materiales para la cantidad pedida", async () => {
  render(<BomCalculatorPanel bom={bom} productUnit="u" />);
  await setQty("100");
  // PEAD 51,5 kg × $1.000 + MB 1,07 kg × $8.000
  expect(screen.getByText(/60\.060,00/)).toBeVisible();
});
