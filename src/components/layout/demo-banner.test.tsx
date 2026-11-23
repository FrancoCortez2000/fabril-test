// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";

import { DemoBanner } from "@/components/layout/demo-banner";

test("avisa que es una demo de sólo lectura y permite volver al sitio", () => {
  render(<DemoBanner />);
  expect(screen.getByText(/Estás viendo una demo de solo lectura de FABRIL/)).toBeVisible();
  expect(screen.getByText(/Los cambios no se guardan/)).toBeVisible();
  expect(screen.getByRole("link", { name: "Volver al sitio" })).toHaveAttribute("href", "/");
});
