// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";

import { DemoSection } from "@/features/marketing/components/demo-section";
import { Hero } from "@/features/marketing/components/hero";
import { SiteFooter } from "@/features/marketing/components/site-footer";
import { SiteHeader } from "@/features/marketing/components/site-header";
import { FAQ, MODULES, STEPS } from "@/features/marketing/content";

vi.mock("@/features/marketing/actions", () => ({ submitDemoRequest: vi.fn() }));

function expectDemoLink(name = "Probar la demo") {
  const links = screen.getAllByRole("link", { name });
  expect(links.length).toBeGreaterThan(0);
  for (const link of links) expect(link).toHaveAttribute("href", "/demo");
}

test("el encabezado ofrece probar la demo", () => {
  render(<SiteHeader />);
  expectDemoLink();
  expect(screen.queryByText(/Solicitar demostración/)).toBeNull();
});

test("el hero ofrece probar la demo y no habla de videollamadas", () => {
  render(<Hero />);
  expectDemoLink();
  expect(screen.queryByText(/Solicitar demostración/)).toBeNull();
  expect(screen.queryByText(/videollamada/i)).toBeNull();
});

test("el pie ofrece probar la demo", () => {
  render(<SiteFooter />);
  expectDemoLink();
  expect(screen.queryByText(/Solicitar demostración/)).toBeNull();
});

test("la sección de cierre invita a recorrer la demo sin formulario", () => {
  render(<DemoSection />);
  expectDemoLink();
  expect(screen.queryByText(/videollamada/i)).toBeNull();
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(screen.getByText(/solo lectura/i)).toBeVisible();
});

describe("contenido", () => {
  test("los módulos coinciden con lo que existe en la demo", () => {
    expect(MODULES.map((m) => m.title)).toEqual([
      "Producción",
      "Inventario",
      "Recetas",
      "Compras",
      "Costos",
    ]);
  });

  test("no promete proveedores, reportes, CSV ni importación desde Excel", () => {
    const text = JSON.stringify({ MODULES, STEPS, FAQ });
    expect(text).not.toMatch(/proveedores|reportes|csv|excel|planilla/i);
  });
});
