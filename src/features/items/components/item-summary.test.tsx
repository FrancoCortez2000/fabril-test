// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";

import { ItemSummary } from "@/features/items/components/item-summary";
import { productDetail, rawMaterialDetail } from "@/features/items/test-fixtures";

test("un producto muestra stock, disponible, costo estándar, precio y margen", () => {
  render(<ItemSummary detail={productDetail} />);
  expect(screen.getByText("Stock")).toBeVisible();
  expect(screen.getByText("50 u")).toBeVisible();
  expect(screen.getByText("Disponible")).toBeVisible();
  expect(screen.getByText("45 u")).toBeVisible();
  expect(screen.getByText("Costo estándar")).toBeVisible();
  expect(screen.getAllByText(/1\.778,00/).length).toBeGreaterThan(0);
  expect(screen.getByText("Precio de venta")).toBeVisible();
  expect(screen.getByText(/2\.850,00/)).toBeVisible();
  expect(screen.getByText("Margen")).toBeVisible();
  expect(screen.getByText("37,6 %")).toBeVisible();
});

test("el desglose del costo estándar suma materiales, mano de obra e indirectos", () => {
  render(<ItemSummary detail={productDetail} />);
  const breakdown = screen.getByRole("region", { name: "Costo estándar por unidad" });
  expect(within(breakdown).getByText("Materiales")).toBeVisible();
  expect(within(breakdown).getByText(/258,00/)).toBeVisible();
  expect(within(breakdown).getByText("Mano de obra")).toBeVisible();
  expect(within(breakdown).getByText(/1\.500,00/)).toBeVisible();
  expect(within(breakdown).getByText("Gastos indirectos")).toBeVisible();
  expect(within(breakdown).getByText(/20,00/)).toBeVisible();
  expect(within(breakdown).getByText("Total")).toBeVisible();
});

test("nunca se muestra el costo manual", () => {
  const { container } = render(<ItemSummary detail={productDetail} />);
  expect(container.textContent).not.toMatch(/costo manual|costo estimado/i);
});

test("un producto sin receta explica por qué no hay costo estándar", () => {
  render(
    <ItemSummary
      detail={{
        ...productDetail,
        item: { ...productDetail.item, standardCost: null, cost: null },
        costing: null,
        marginPct: null,
      }}
    />,
  );
  expect(screen.getByText(/todavía no tiene receta/i)).toBeVisible();
  expect(screen.getByText("Margen")).toBeVisible();
  expect(screen.queryByText(/NaN/)).toBeNull();
});

test("una materia prima muestra costo promedio y último costo, sin precio ni margen", () => {
  render(<ItemSummary detail={rawMaterialDetail} />);
  expect(screen.getByText("Costo promedio")).toBeVisible();
  expect(screen.getByText(/1\.000,00/)).toBeVisible();
  expect(screen.getByText("Último costo de compra")).toBeVisible();
  expect(screen.getByText(/1\.100,00/)).toBeVisible();
  expect(screen.queryByText("Precio de venta")).toBeNull();
  expect(screen.queryByText("Margen")).toBeNull();
  expect(screen.queryByRole("region", { name: "Costo estándar por unidad" })).toBeNull();
});

test("un ítem archivado lo indica", () => {
  render(
    <ItemSummary detail={{ ...productDetail, item: { ...productDetail.item, archived: true } }} />,
  );
  expect(screen.getByText("Archivado")).toBeVisible();
});
