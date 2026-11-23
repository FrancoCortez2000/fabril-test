// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AccessProvider } from "@/components/layout/access-provider";
import { CommandMenu } from "@/components/layout/command-menu";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next-themes", () => ({ useTheme: () => ({ setTheme: vi.fn() }) }));

beforeAll(() => {
  // cmdk usa APIs de layout que jsdom no implementa.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
});

test("el botón de búsqueda abre el menú de comandos", async () => {
  render(<CommandMenu />);
  await userEvent.click(screen.getByRole("button", { name: /Buscar/ }));
  expect(await screen.findByPlaceholderText("Escribí un módulo o una acción…")).toBeVisible();
});

test("Ctrl+K abre el menú y elegir un módulo navega", async () => {
  render(<CommandMenu />);
  await userEvent.keyboard("{Control>}k{/Control}");
  await userEvent.type(await screen.findByPlaceholderText(/Escribí/), "inventario");
  await userEvent.keyboard("{Enter}");
  expect(push).toHaveBeenCalledWith("/app/inventario");
});

test("en la demo el menú de comandos no ofrece Configuración", async () => {
  render(
    <AccessProvider role={null} mode="demo">
      <CommandMenu />
    </AccessProvider>,
  );
  await userEvent.click(screen.getByRole("button", { name: /Buscar/ }));
  await screen.findByPlaceholderText(/Escribí/);
  expect(screen.getByRole("option", { name: /Inventario/ })).toBeVisible();
  expect(screen.queryByRole("option", { name: /Configuración/ })).toBeNull();
});
