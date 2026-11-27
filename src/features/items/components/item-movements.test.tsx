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
  // El tipo se muestra en su columna (escritorio) y bajo la fecha (celular).
  expect(screen.getAllByText("Compra recibida")).toHaveLength(2);
  expect(screen.getAllByText("Consumo de producción")).toHaveLength(2);
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
  expect(screen.getAllByText("algo_nuevo").length).toBeGreaterThan(0);
});

describe("presentación en tarjeta", () => {
  test("es una región «Movimientos» con la cantidad y un enlace al historial filtrado", () => {
    render(<ItemMovements rows={[movement(), movement({ id: "m2" })]} />);
    const region = screen.getByRole("region", { name: "Movimientos" });
    expect(region).toHaveTextContent("Últimos 2");
    expect(screen.getByRole("link", { name: /Ver todos/ })).toHaveAttribute(
      "href",
      `/app/inventario/movimientos?item=${movement().itemId}`,
    );
  });

  test("las entradas se distinguen de las salidas (además del signo)", () => {
    render(
      <ItemMovements
        rows={[movement(), movement({ id: "m2", type: "manual_out", quantity: -5 })]}
      />,
    );
    expect(screen.getByText("+100 kg").className).toMatch(/text-status-completed/);
    expect(screen.getByText("-5 kg").className).not.toMatch(/text-status-completed/);
  });

  test("sin movimientos el estado vacío queda dentro de la tarjeta y sin «Ver todos»", () => {
    render(<ItemMovements rows={[]} />);
    expect(screen.getByRole("region", { name: "Movimientos" })).toHaveTextContent(
      "Todavía no tiene movimientos de stock.",
    );
    expect(screen.queryByRole("link", { name: /Ver todos/ })).toBeNull();
  });
});

test("el detalle no repite el código del documento que ya se muestra", () => {
  render(
    <ItemMovements
      rows={[
        movement({
          type: "production_consumption",
          quantity: -10,
          reference: "OP-2026-0049",
          referenceType: "production_order",
          referenceId: "99999999-9999-4999-8999-999999999999",
          reason: "Consumo OP-2026-0049",
        }),
      ]}
    />,
  );
  expect(screen.getByText("Consumo")).toBeVisible();
  expect(screen.queryByText("Consumo OP-2026-0049")).toBeNull();
});

test("un motivo sin código de documento queda igual", () => {
  render(<ItemMovements rows={[movement({ reference: null, reason: "Despacho a clientes" })]} />);
  expect(screen.getByText("Despacho a clientes")).toBeVisible();
});
