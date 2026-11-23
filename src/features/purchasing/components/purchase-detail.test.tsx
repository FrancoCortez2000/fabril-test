// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";

import { PurchaseDetail } from "@/features/purchasing/components/purchase-detail";
import { lines, purchase } from "@/features/purchasing/test-fixtures";

test("cabecera con proveedor, estado, fechas y totales con IVA", () => {
  render(<PurchaseDetail purchase={purchase()} lines={lines} />);
  expect(screen.getByText("Petroquímica Sur")).toBeVisible();
  expect(screen.getByText("Parcialmente recibida")).toBeVisible();
  expect(screen.getByText("01/09/2026")).toBeVisible();
  expect(screen.getByText("01/10/2026")).toBeVisible();
  const totals = screen.getByRole("region", { name: "Totales" });
  expect(within(totals).getByText(/13\.000,00/)).toBeVisible();
  expect(within(totals).getByText(/2\.730,00/)).toBeVisible();
  expect(within(totals).getByText(/15\.730,00/)).toBeVisible();
});

test("las líneas muestran pedido, recibido y pendiente de cada material", () => {
  render(<PurchaseDetail purchase={purchase()} lines={lines} />);
  const pead = screen.getByRole("row", { name: /PEAD/ });
  expect(within(pead).getAllByText("100 kg").length).toBeGreaterThanOrEqual(2); // pedido y recibido
  expect(within(pead).getByText("0 kg")).toBeVisible(); // pendiente
  const mb = screen.getByRole("row", { name: /Masterbatch/ });
  expect(within(mb).getByText("0 kg")).toBeVisible(); // recibido
  expect(within(mb).getAllByText("100 kg").length).toBeGreaterThanOrEqual(2); // pedido y pendiente
});

test("cada material enlaza a su ficha de materia prima", () => {
  render(<PurchaseDetail purchase={purchase()} lines={lines} />);
  expect(screen.getByRole("link", { name: /PEAD/ })).toHaveAttribute(
    "href",
    "/app/materias-primas/55555555-5555-4555-8555-555555555555",
  );
});

test("una compra vencida lo indica", () => {
  render(<PurchaseDetail purchase={purchase({ isLate: true })} lines={lines} />);
  expect(screen.getByText(/entrega vencida/i)).toBeVisible();
});

test("una compra cancelada muestra el motivo", () => {
  render(
    <PurchaseDetail
      purchase={purchase({ status: "cancelled", cancelReason: "Cambio de proveedor" })}
      lines={lines}
    />,
  );
  expect(screen.getByText(/Cambio de proveedor/)).toBeVisible();
});

test("las notas se muestran si existen", () => {
  render(<PurchaseDetail purchase={purchase({ notes: "Entregar por la tarde" })} lines={lines} />);
  expect(screen.getByText("Entregar por la tarde")).toBeVisible();
});
