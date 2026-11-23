// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";

import { ItemMovements } from "@/features/items/components/item-movements";
import { movement } from "@/features/items/test-fixtures";

test("lista los movimientos con tipo, cantidad con signo, saldo y documento de origen", () => {
  render(
    <ItemMovements
      rows={[
        movement(),
        movement({
          id: "m2",
          type: "production_consumption",
          quantity: -25.8,
          balanceAfter: 74.2,
          reference: "OP-2026-0001",
          unitCost: 50,
        }),
      ]}
    />,
  );
  expect(screen.getByText("Compra recibida")).toBeVisible();
  expect(screen.getByText("Consumo de producción")).toBeVisible();
  expect(screen.getByText("+100 kg")).toBeVisible();
  expect(screen.getByText("-25,8 kg")).toBeVisible();
  expect(screen.getByText("74,2 kg")).toBeVisible();
  expect(screen.getByText("OC-2026-0001")).toBeVisible();
  expect(screen.getByText("OP-2026-0001")).toBeVisible();
});

test("el motivo y la marca de revertido se ven", () => {
  render(
    <ItemMovements
      rows={[
        movement({ type: "manual_in", reason: "Conteo físico", reference: null, reversed: true }),
      ]}
    />,
  );
  expect(screen.getByText("Conteo físico")).toBeVisible();
  expect(screen.getByText("Revertido")).toBeVisible();
});

test("sin movimientos muestra un estado vacío", () => {
  render(<ItemMovements rows={[]} />);
  expect(screen.getByText(/todavía no tiene movimientos/i)).toBeVisible();
});

test("un tipo desconocido no rompe la tabla", () => {
  render(<ItemMovements rows={[movement({ type: "algo_nuevo" })]} />);
  expect(screen.getByText("algo_nuevo")).toBeVisible();
});
