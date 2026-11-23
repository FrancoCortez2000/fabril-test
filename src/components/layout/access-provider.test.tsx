// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";

import { AccessProvider, useAccess } from "@/components/layout/access-provider";

function Probe() {
  const { mode, role, can } = useAccess();
  return (
    <p>
      {mode}|{String(role)}|{String(can("manageCatalog"))}
    </p>
  );
}

test("un administrador puede gestionar el catálogo", () => {
  render(
    <AccessProvider role="admin" mode="member">
      <Probe />
    </AccessProvider>,
  );
  expect(screen.getByText("member|admin|true")).toBeVisible();
});

test("el visitante de la demo no puede nada", () => {
  render(
    <AccessProvider role={null} mode="demo">
      <Probe />
    </AccessProvider>,
  );
  expect(screen.getByText("demo|null|false")).toBeVisible();
});

test("sin proveedor el acceso por defecto es de sólo lectura", () => {
  render(<Probe />);
  expect(screen.getByText("member|null|false")).toBeVisible();
});
