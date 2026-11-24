// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";

import { ExportButton } from "@/components/data/export-button";

test("es un enlace de descarga hacia la exportación", () => {
  render(<ExportButton href="/app/inventario/exportar" />);
  const link = screen.getByRole("link", { name: "Exportar CSV" });
  expect(link).toHaveAttribute("href", "/app/inventario/exportar");
  expect(link).toHaveAttribute("download");
});

test("el texto se puede cambiar", () => {
  render(<ExportButton href="/x" label="Descargar" />);
  expect(screen.getByRole("link", { name: "Descargar" })).toBeVisible();
});
