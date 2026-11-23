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

test("el documento de origen enlaza a su ficha según el tipo", () => {
  render(
    <ItemMovements
      rows={[
        movement(),
        movement({
          id: "m2",
          type: "production_consumption",
          reference: "OP-2026-0001",
          referenceType: "production_order",
          referenceId: "99999999-9999-4999-8999-999999999999",
        }),
      ]}
    />,
  );
  expect(screen.getByRole("link", { name: "OC-2026-0001" })).toHaveAttribute(
    "href",
    "/app/compras/88888888-8888-4888-8888-888888888888",
  );
  expect(screen.getByRole("link", { name: "OP-2026-0001" })).toHaveAttribute(
    "href",
    "/app/produccion/99999999-9999-4999-8999-999999999999",
  );
});

test("una referencia sin documento identificable queda como texto", () => {
  render(
    <ItemMovements
      rows={[movement({ reference: "OC-X", referenceType: null, referenceId: null })]}
    />,
  );
  expect(screen.getByText("OC-X")).toBeVisible();
  expect(screen.queryByRole("link", { name: "OC-X" })).toBeNull();
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
