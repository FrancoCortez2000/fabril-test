// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";

import { SkipLink } from "@/components/layout/skip-link";

test("ofrece saltar directo al contenido principal", () => {
  render(<SkipLink />);
  expect(screen.getByRole("link", { name: "Saltar al contenido" })).toHaveAttribute(
    "href",
    "#contenido",
  );
});
