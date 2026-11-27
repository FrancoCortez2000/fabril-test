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
  // el margen aparece en su tarjeta y como parte "Ganancia" del desglose
  expect(screen.getAllByText("37,6 %").length).toBeGreaterThan(0);
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

describe("desglose a todo el ancho", () => {
  // productDetail: materiales 258 + mano de obra 1.500 + indirectos 20 = 1.778; precio 2.850.
  const region = () => screen.getByRole("region", { name: "Costo estándar por unidad" });

  test("con precio, la barra reparte el precio en costo y ganancia, con el porcentaje de cada parte", () => {
    render(<ItemSummary detail={productDetail} />);
    const r = region();
    expect(within(r).getByText("Ganancia")).toBeVisible();
    expect(within(r).getByText(/1\.072,00/)).toBeVisible();
    expect(within(r).getByText("9,1 %")).toBeVisible(); // 258 / 2.850
    expect(within(r).getByText("52,6 %")).toBeVisible(); // 1.500 / 2.850
    expect(within(r).getByText("37,6 %")).toBeVisible(); // ganancia
    expect(within(r).getAllByText(/del precio de venta/)).toHaveLength(4);
    const bar = within(r).getByRole("img");
    expect(bar).toHaveAccessibleName(
      /Materiales 9,1\s%.*Mano de obra 52,6\s%.*Gastos indirectos 0,7\s%.*Ganancia 37,6\s%/,
    );
  });

  test("el total del costo queda junto al título", () => {
    render(<ItemSummary detail={productDetail} />);
    expect(within(region()).getByText(/Total/)).toBeVisible();
    expect(within(region()).getAllByText(/1\.778,00/).length).toBeGreaterThan(0);
  });

  test("sin precio de venta la barra reparte sólo el costo y no hay ganancia", () => {
    render(
      <ItemSummary
        detail={{
          ...productDetail,
          item: { ...productDetail.item, salePrice: null },
          marginPct: null,
        }}
      />,
    );
    const r = region();
    expect(within(r).queryByText("Ganancia")).toBeNull();
    expect(within(r).getByText("84,4 %")).toBeVisible(); // 1.500 / 1.778
    expect(within(r).getAllByText(/del costo/)).toHaveLength(3);
  });

  test("si el precio no cubre el costo lo dice con palabras y no dibuja ganancia", () => {
    render(
      <ItemSummary
        detail={{
          ...productDetail,
          item: { ...productDetail.item, salePrice: 1500 },
          marginPct: -18.5,
        }}
      />,
    );
    const r = region();
    expect(within(r).queryByText("Ganancia")).toBeNull();
    expect(within(r).getByText(/se pierden \$\s?278,00 por unidad/)).toBeVisible();
  });
});
