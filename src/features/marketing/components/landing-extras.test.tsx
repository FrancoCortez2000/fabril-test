// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";

import { BuiltWith } from "@/features/marketing/components/built-with";
import { Hero } from "@/features/marketing/components/hero";
import { SiteHeader } from "@/features/marketing/components/site-header";
import { BUILD_FACTS, FLOW, STACK } from "@/features/marketing/content";

describe("diagrama del hero: cómo se conecta todo", () => {
  test("es una figura con título y los cuatro pasos en orden", () => {
    render(<Hero />);
    const figure = screen.getByRole("figure", { name: /Así se conecta todo/ });
    const steps = within(figure).getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    expect(steps.map((s) => within(s).getByRole("heading").textContent)).toEqual(
      FLOW.map((f) => f.title),
    );
  });

  test("sigue el ejemplo de la calculadora: la compra cubre los 57,5 kg que faltaban", () => {
    render(<Hero />);
    const figure = screen.getByRole("figure", { name: /Así se conecta todo/ });
    expect(within(figure).getByText(/257,5 kg/)).toBeVisible();
    expect(within(figure).getByText(/Ejemplo/)).toBeVisible();
    expect(figure).toHaveTextContent(/costo real/i);
  });

  test("cada paso tiene un resultado (qué cambió en el stock o el costo)", () => {
    for (const step of FLOW) {
      expect(step.result.length).toBeGreaterThan(3);
      expect(step.body.length).toBeGreaterThan(10);
    }
  });
});

describe("sección «Cómo está hecho»", () => {
  test("es una región con los datos técnicos verificables y el stack", () => {
    render(<BuiltWith />);
    const region = screen.getByRole("region", { name: "Cómo está hecho" });
    for (const fact of BUILD_FACTS) {
      expect(within(region).getByRole("heading", { name: fact.title })).toBeVisible();
    }
    for (const tech of STACK) expect(within(region).getByText(tech)).toBeVisible();
  });

  test("tres tarjetas, sin la de la demo, sin enlace a GitHub ni «Lo que no se ve en la demo»", () => {
    render(<BuiltWith />);
    const region = screen.getByRole("region", { name: "Cómo está hecho" });
    expect(BUILD_FACTS).toHaveLength(3);
    expect(within(region).queryByText(/Demo abierta/)).toBeNull();
    expect(within(region).queryByRole("link", { name: /GitHub/ })).toBeNull();
    expect(region.textContent).not.toMatch(/Lo que no se ve en la demo/);
    expect(within(region).getByText(/Dónde vive la lógica/)).toBeVisible();
  });

  test("el encabezado de la landing lleva a la sección", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "Cómo está hecho" })).toHaveAttribute(
      "href",
      "#como-esta-hecho",
    );
  });
});
