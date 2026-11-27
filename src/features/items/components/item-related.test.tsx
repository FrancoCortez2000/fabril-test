// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";

import { ProductOrders, PurchaseHistory, UsedIn } from "@/features/items/components/item-related";

test("usado en: cada producto enlaza a su ficha con la cantidad por rendimiento", () => {
  render(
    <UsedIn
      unitCode="kg"
      rows={[
        {
          productId: "p1",
          productName: "Bidón 5 L",
          productSku: "BID-5L",
          quantity: 0.25,
          wastePct: null,
          outputQty: 1,
        },
      ]}
    />,
  );
  expect(screen.getByRole("link", { name: /Bidón 5 L/ })).toHaveAttribute(
    "href",
    "/app/productos/p1",
  );
  expect(screen.getByText(/0,25 kg por 1/)).toBeVisible();
});

test("usado en: sin recetas explica que no se usa", () => {
  render(<UsedIn unitCode="kg" rows={[]} />);
  expect(screen.getByText(/ninguna receta/i)).toBeVisible();
});

test("compras recientes: código, proveedor, fecha, cantidad y precio, con enlace a la compra", () => {
  render(
    <PurchaseHistory
      rows={[
        {
          purchaseId: "po1",
          code: "OC-2026-0001",
          status: "received",
          orderDate: "2026-10-01",
          expectedDate: null,
          quantity: 100,
          receivedQty: 100,
          unitPrice: 50,
          supplierName: "Petroquímica Sur",
        },
      ]}
      unitCode="kg"
    />,
  );
  expect(screen.getByText("OC-2026-0001")).toBeVisible();
  expect(screen.getByText("Petroquímica Sur")).toBeVisible();
  expect(screen.getByText("01/10/2026")).toBeVisible();
  expect(screen.getByText("100 kg")).toBeVisible();
  expect(screen.getByText(/50,00/)).toBeVisible();
  expect(screen.getByText("Recibida")).toBeVisible();
  expect(screen.getByRole("link", { name: /OC-2026-0001/ })).toHaveAttribute(
    "href",
    "/app/compras/po1",
  );
});

test("compras recientes: sin compras muestra un estado vacío", () => {
  render(<PurchaseHistory rows={[]} unitCode="kg" />);
  expect(screen.getByText(/todavía no se compró/i)).toBeVisible();
});

test("órdenes del producto: estado, progreso y marca de demorada", () => {
  render(
    <ProductOrders
      rows={[
        {
          id: "o1",
          code: "OP-2026-0001",
          status: "in_progress",
          plannedQty: 100,
          goodQty: 40,
          progressPct: 40,
          isDelayed: true,
          plannedEndDate: "2026-11-05",
        },
      ]}
      unitCode="u"
    />,
  );
  expect(screen.getByText("OP-2026-0001")).toBeVisible();
  expect(screen.getByText("En producción")).toBeVisible();
  expect(screen.getByText("Demorada")).toBeVisible();
  expect(screen.getByText("40 / 100 u")).toBeVisible();
  expect(screen.getByText("05/11/2026")).toBeVisible();
});

test("órdenes del producto: sin órdenes muestra un estado vacío", () => {
  render(<ProductOrders rows={[]} unitCode="u" />);
  expect(screen.getByText(/todavía no tiene órdenes/i)).toBeVisible();
});

describe("tarjetas y enlaces", () => {
  test("cada bloque es una región con su título", () => {
    render(
      <>
        <UsedIn unitCode="kg" rows={[]} />
        <PurchaseHistory unitCode="kg" rows={[]} />
        <ProductOrders unitCode="u" rows={[]} />
      </>,
    );
    for (const name of ["Usado en", "Compras recientes", "Órdenes de producción"]) {
      expect(screen.getByRole("region", { name })).toBeVisible();
    }
  });

  test("el código de cada orden de producción enlaza a su ficha", () => {
    render(
      <ProductOrders
        unitCode="u"
        rows={[
          {
            id: "o1",
            code: "OP-2026-0001",
            status: "completed",
            isDelayed: false,
            goodQty: 98,
            plannedQty: 100,
            progressPct: 98,
            plannedEndDate: "2026-06-03",
          },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "OP-2026-0001" })).toHaveAttribute(
      "href",
      "/app/produccion/o1",
    );
  });
});
