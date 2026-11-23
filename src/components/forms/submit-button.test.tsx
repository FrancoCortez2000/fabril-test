// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";

import { SubmitButton } from "@/components/forms/submit-button";
import { AccessProvider } from "@/components/layout/access-provider";

test("con permiso está habilitado y muestra su texto", () => {
  render(
    <AccessProvider role="admin" mode="member">
      <SubmitButton permission="manageCatalog">Guardar</SubmitButton>
    </AccessProvider>,
  );
  const button = screen.getByRole("button", { name: "Guardar" });
  expect(button).toBeEnabled();
  expect(button).toHaveAttribute("type", "submit");
});

test("en la demo queda deshabilitado y lo explica", () => {
  render(
    <AccessProvider role={null} mode="demo">
      <SubmitButton permission="manageCatalog">Guardar</SubmitButton>
    </AccessProvider>,
  );
  const button = screen.getByRole("button", { name: "No disponible en la demo" });
  expect(button).toBeDisabled();
  expect(screen.queryByText("Guardar")).toBeNull();
});

test("sin permiso fuera de la demo queda deshabilitado con su texto", () => {
  render(
    <AccessProvider role={null} mode="member">
      <SubmitButton permission="manageCatalog">Guardar</SubmitButton>
    </AccessProvider>,
  );
  expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
});

test("mientras guarda se deshabilita y marca el estado ocupado", () => {
  render(
    <AccessProvider role="admin" mode="member">
      <SubmitButton permission="manageCatalog" pending>
        Guardar
      </SubmitButton>
    </AccessProvider>,
  );
  const button = screen.getByRole("button", { name: /Guardar/ });
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute("aria-busy", "true");
});
