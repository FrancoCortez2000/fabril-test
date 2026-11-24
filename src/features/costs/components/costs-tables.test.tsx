// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";

import { CostsTable } from "@/features/costs/components/costs-table";
import { DeviationTable } from "@/features/costs/components/deviation-table";
import type { OrderDeviationRow, ProductCostRow } from "@/features/costs/types";

const product = (over: Partial<ProductCostRow> = {}): ProductCostRow => ({
  itemId: "p1",
  name: "Balde 10 L rojo",
  sku: "BAL-10L",
  materials: 1163.86,
  labor: 86.67,
  overhead: 45,
  standard: 1295.53,
  price: 4200,
  margin: 69.2,
  ...over,
});

describe("CostsTable", () => {
  test("muestra costos, precio y margen, con el producto enlazado a su ficha", () => {
    render(<CostsTable products={[product()]} />);
    const row = screen.getByRole("row", { name: /Balde 10 L rojo/ });
    expect(within(row).getByRole("link", { name: "Balde 10 L rojo" })).toHaveAttribute(
      "href",
      "/app/productos/p1",
    );
    expect(row).toHaveTextContent("1.295,53");
    expect(row).toHaveTextContent("4.200,00");
    expect(row).toHaveTextContent("69,2 %");
  });

  test("lo que falta se muestra como guion, nunca como 0", () => {
    render(
      <CostsTable
        products={[
          product({ materials: null, labor: null, overhead: null, standard: null, margin: null }),
        ]}
      />,
    );
    const row = screen.getByRole("row", { name: /Balde 10 L rojo/ });
    expect(within(row).getAllByText("—").length).toBeGreaterThanOrEqual(4);
    expect(row.textContent).not.toMatch(/(^|[^\d.])0,00/);
    expect(within(row).getByText("Sin receta")).toBeVisible();
  });

  test("un margen negativo se dice con palabras, no sólo con color", () => {
    render(<CostsTable products={[product({ margin: -12.5 })]} />);
    expect(screen.getByRole("row", { name: /Balde/ })).toHaveTextContent("-12,5 %");
    expect(screen.getByText("Pierde plata")).toBeVisible();
  });

  test("sin productos muestra el estado vacío", () => {
    render(<CostsTable products={[]} />);
    expect(screen.getByText("Todavía no hay productos con receta")).toBeVisible();
  });
});

describe("DeviationTable", () => {
  const dev = (over: Partial<OrderDeviationRow> = {}): OrderDeviationRow => ({
    id: "o1",
    code: "OP-2026-0001",
    itemName: "Balde 10 L rojo",
    plannedUnit: 1300,
    actualUnit: 1430,
    ...over,
  });

  test("compara el costo unitario planificado y el real con el desvío dicho con palabras", () => {
    render(<DeviationTable deviations={[dev()]} />);
    const row = screen.getByRole("row", { name: /OP-2026-0001/ });
    expect(within(row).getByRole("link", { name: "OP-2026-0001" })).toHaveAttribute(
      "href",
      "/app/produccion/o1",
    );
    expect(row).toHaveTextContent("1.300,00");
    expect(row).toHaveTextContent("1.430,00");
    expect(row).toHaveTextContent("más caro");
    expect(row).toHaveTextContent("+10 %");
  });

  test("un costo real menor se dice más barato", () => {
    render(<DeviationTable deviations={[dev({ actualUnit: 1170 })]} />);
    expect(screen.getByRole("row", { name: /OP-2026-0001/ })).toHaveTextContent("más barato");
  });

  test("sin órdenes completadas muestra el estado vacío", () => {
    render(<DeviationTable deviations={[]} />);
    expect(screen.getByText("Todavía no hay órdenes completadas")).toBeVisible();
  });
});
