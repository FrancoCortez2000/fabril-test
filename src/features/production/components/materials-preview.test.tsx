// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";

import type { BomView } from "@/features/items/bom-queries";
import { MaterialsPreview } from "@/features/production/components/materials-preview";

const PRODUCT = "11111111-1111-4111-8111-111111111111";

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

const renderPreview = (over: Partial<React.ComponentProps<typeof MaterialsPreview>> = {}) =>
  render(<MaterialsPreview productId={PRODUCT} bom={bom} plannedQty={100} {...over} />);

test("calcula lo requerido con el desperdicio de la fábrica y el de cada línea", () => {
  renderPreview();
  expect(within(screen.getByRole("row", { name: /PEAD/ })).getByText("51,5 kg")).toBeVisible();
  expect(
    within(screen.getByRole("row", { name: /Masterbatch/ })).getByText("1,07 kg"),
  ).toBeVisible();
});

test("marca el faltante y avisa que la compra se crea desde la orden", () => {
  renderPreview();
  const mb = screen.getByRole("row", { name: /Masterbatch/ });
  expect(within(mb).getByText("0,57 kg")).toBeVisible();
  expect(within(mb).getByText("Falta")).toBeVisible();
  expect(screen.getByText(/Faltan 1 materia prima/)).toBeVisible();
  expect(screen.getByText(/compra se crea desde la orden/i)).toBeVisible();
});

test("si alcanza todo lo dice", () => {
  renderPreview({ plannedQty: 10 });
  expect(screen.getByText(/Alcanza con lo que hay disponible/)).toBeVisible();
  expect(screen.queryByText("Falta")).toBeNull();
});

test("sin receta lo explica y enlaza a la ficha del producto", () => {
  renderPreview({ bom: null });
  expect(screen.getByText("Este producto no tiene receta")).toBeVisible();
  expect(screen.getByRole("link", { name: /Cargar la receta/ })).toHaveAttribute(
    "href",
    `/app/productos/${PRODUCT}`,
  );
  expect(screen.queryByRole("table")).toBeNull();
});

test.each([[null], [0], [-5], [Number.NaN]])(
  "con la cantidad %s no muestra filas ni NaN",
  (plannedQty) => {
    const { container } = renderPreview({ plannedQty });
    expect(screen.queryByRole("row", { name: /PEAD/ })).toBeNull();
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
    expect(screen.getByText(/Elegí una cantidad/)).toBeVisible();
  },
);

test("sin producto elegido invita a elegirlo", () => {
  renderPreview({ productId: null, bom: null, plannedQty: null });
  expect(screen.getByText(/Elegí un producto/)).toBeVisible();
});
