// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";

import { KpiRow } from "@/features/dashboard/components/kpi-row";

const ZERO = {
  products: 0,
  rawMaterials: 0,
  inventoryValue: 0,
  activeOrders: 0,
  unitsThisMonth: 0,
  unitsSamePeriodLastMonth: 0,
};

test("sin datos no muestra NaN, Infinity ni variación", () => {
  const { container } = render(<KpiRow kpis={ZERO} currentMonth="2026-11" />);
  expect(container.textContent).not.toMatch(/NaN|Infinity/);
  expect(screen.queryByText(/%/)).toBeNull();
});

test("con el mes anterior en cero muestra las unidades sin porcentaje", () => {
  const { container } = render(
    <KpiRow kpis={{ ...ZERO, unitsThisMonth: 700 }} currentMonth="2026-11" />,
  );
  expect(container.textContent).toContain("700");
  expect(container.textContent).not.toMatch(/NaN|Infinity|%/);
});

test("con mes anterior comparable muestra la variación", () => {
  render(
    <KpiRow
      kpis={{ ...ZERO, unitsThisMonth: 700, unitsSamePeriodLastMonth: 250 }}
      currentMonth="2026-11"
    />,
  );
  expect(screen.getByText(/180/)).toBeVisible();
});
