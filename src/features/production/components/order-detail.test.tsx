// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";

import { OrderDetail } from "@/features/production/components/order-detail";
import { detail, orderFull, PRODUCT_ID } from "@/features/production/test-fixtures";

const completed = () =>
  detail({
    order: orderFull({
      status: "completed",
      goodQty: 880,
      defectiveQty: 20,
      progressPct: 98,
      completedAt: "2026-11-20T12:00:00+00:00",
      actualMaterialCost: 110000,
      actualLaborCost: 19000,
      actualOverheadCost: 5000,
      actualUnitCost: 148.89,
    }),
  });

test("resumen: producto enlazado, estado, prioridad, fechas y cantidades", () => {
  render(<OrderDetail data={detail()} />);
  expect(screen.getByRole("link", { name: /Balde 10 L rojo/ })).toHaveAttribute(
    "href",
    `/app/productos/${PRODUCT_ID}`,
  );
  expect(screen.getAllByText("En producción").length).toBeGreaterThan(0);
  expect(screen.getByText("01/11/2026")).toBeVisible();
  expect(screen.getByText("30/11/2026")).toBeVisible();
  expect(screen.getByText("300 / 900 u")).toBeVisible();
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");
});

test("materiales: planificado, consumido, devuelto y merma por material", () => {
  render(<OrderDetail data={detail()} />);
  const pp = screen.getByRole("row", { name: /Polipropileno/ });
  expect(within(pp).getAllByText("378 kg").length).toBe(2);
  expect(within(pp).getByText("2,5 kg")).toBeVisible();
  const mb = screen.getByRole("row", { name: /Masterbatch/ });
  expect(within(mb).getByText("0,4 kg")).toBeVisible();
});

test("personal con horas y partes de avance", () => {
  render(<OrderDetail data={detail()} />);
  const people = screen.getByRole("region", { name: "Personal" });
  expect(within(people).getByText("Juan Sosa")).toBeVisible();
  expect(within(people).getByText(/12,5 h/)).toBeVisible();
  const partes = screen.getByRole("region", { name: "Partes de avance" });
  expect(within(partes).getByText("05/11/2026")).toBeVisible();
  expect(within(partes).getByText("Primer turno")).toBeVisible();
});

test("historial de eventos en orden", () => {
  render(<OrderDetail data={detail()} />);
  const history = screen.getByRole("region", { name: "Historial" });
  const items = within(history).getAllByRole("listitem");
  expect(items[0]?.textContent).toContain("Planificada");
  expect(items[1]?.textContent).toContain("En producción");
  expect(items[1]?.textContent).toContain("Materiales consumidos");
});

describe("costos planificado vs real", () => {
  test("sin completar muestra lo planificado y avisa que falta el real", () => {
    render(<OrderDetail data={detail()} />);
    const costs = screen.getByRole("region", { name: "Costos" });
    expect(within(costs).getAllByText(/100\.000,00/).length).toBeGreaterThan(0);
    expect(within(costs).getByText(/125\.000,00/)).toBeVisible();
    expect(within(costs).getByText(/se calcula al completar/i)).toBeVisible();
    expect(within(costs).queryByText(/más caro|más barato/)).toBeNull();
  });

  test("completada: total real, unitario y desvío en pesos y porcentaje, dicho con palabras", () => {
    render(<OrderDetail data={completed()} />);
    const costs = screen.getByRole("region", { name: "Costos" });
    expect(within(costs).getByText(/134\.000,00/)).toBeVisible(); // real total
    expect(within(costs).getByText(/148,89/)).toBeVisible(); // unitario real
    // Materiales: 110.000 vs 100.000 planificado → más caro
    expect(within(costs).getAllByText(/más caro/).length).toBeGreaterThan(0);
    // Mano de obra: 19.000 vs 20.000 → más barato
    expect(within(costs).getAllByText(/más barato/).length).toBeGreaterThan(0);
    expect(within(costs).getAllByText(/10 %/).length).toBeGreaterThan(0);
  });

  test("un componente igual a lo planificado no marca desvío", () => {
    render(<OrderDetail data={completed()} />);
    const costs = screen.getByRole("region", { name: "Costos" });
    const overhead = within(costs).getByRole("row", { name: /Gastos indirectos/ });
    expect(within(overhead).getByText(/sin desvío/i)).toBeVisible();
  });
});

test("una orden cancelada muestra el motivo", () => {
  render(
    <OrderDetail
      data={detail({
        order: orderFull({
          status: "cancelled",
          cancelledAt: "2026-11-10T12:00:00+00:00",
          cancelReason: "Falta de materia prima",
        }),
      })}
    />,
  );
  expect(screen.getByText(/Falta de materia prima/)).toBeVisible();
});

test("una orden demorada lo indica y las notas se muestran", () => {
  render(
    <OrderDetail
      data={detail({ order: orderFull({ isDelayed: true, notes: "Urgente para cliente" }) })}
    />,
  );
  expect(screen.getByText("Demorada")).toBeVisible();
  expect(screen.getByText("Urgente para cliente")).toBeVisible();
});

test("sin personal, partes ni historial muestra estados vacíos sin romper", () => {
  render(<OrderDetail data={detail({ team: [], reports: [], events: [] })} />);
  expect(screen.getByText(/sin personal asignado/i)).toBeVisible();
  expect(screen.getByText(/todavía no hay partes de avance/i)).toBeVisible();
});
