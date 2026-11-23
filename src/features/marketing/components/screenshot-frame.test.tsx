// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";

import { Hero } from "@/features/marketing/components/hero";
import { ModulesShowcase } from "@/features/marketing/components/modules-showcase";
import { ScreenshotFrame } from "@/features/marketing/components/screenshot-frame";
import { MODULES } from "@/features/marketing/content";

describe("ScreenshotFrame", () => {
  test("con src muestra la captura con el label como texto alternativo", () => {
    render(
      <ScreenshotFrame label="Pantalla de Producción en FABRIL" src="/capturas/produccion.png" />,
    );
    const img = screen.getByRole("img", { name: "Pantalla de Producción en FABRIL" });
    expect(img).toHaveAttribute("src", "/capturas/produccion.png");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("width", "1192");
    expect(img).toHaveAttribute("height", "745");
  });

  test("sin src conserva el marco vacío con su texto", () => {
    render(<ScreenshotFrame label="Pantalla de Compras en FABRIL" />);
    expect(screen.queryByRole("img", { name: /Pantalla de Compras/ })).toBeNull();
    expect(screen.getByText(/Captura/)).toBeVisible();
  });

  test("el figcaption accesible se mantiene con y sin captura", () => {
    const { container, rerender } = render(<ScreenshotFrame label="Una pantalla" />);
    expect(container.querySelector("figcaption")).toHaveTextContent("Una pantalla");
    rerender(<ScreenshotFrame label="Una pantalla" src="/capturas/x.png" />);
    expect(container.querySelector("figcaption")).toHaveTextContent("Una pantalla");
  });
});

test("los 5 módulos tienen su captura en /capturas/", () => {
  expect(MODULES).toHaveLength(5);
  for (const m of MODULES) expect(m.screenshot).toBe(`/capturas/${m.id}.png`);
});

test("la sección de funcionalidades muestra una captura por módulo", () => {
  render(<ModulesShowcase />);
  for (const m of MODULES) {
    expect(screen.getByRole("img", { name: `Pantalla de ${m.title} en FABRIL` })).toHaveAttribute(
      "src",
      m.screenshot,
    );
  }
});

test("el hero muestra la captura del dashboard", () => {
  render(<Hero />);
  expect(screen.getByRole("img", { name: /Dashboard/ })).toHaveAttribute(
    "src",
    "/capturas/dashboard.png",
  );
});
