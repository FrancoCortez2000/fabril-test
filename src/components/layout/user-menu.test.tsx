// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UserMenu } from "@/components/layout/user-menu";
import { signOut } from "@/features/auth/actions";
import { exitDemo } from "@/features/demo/actions";

vi.mock("@/features/auth/actions", () => ({ signOut: vi.fn() }));
vi.mock("@/features/demo/actions", () => ({ exitDemo: vi.fn() }));
vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "light", setTheme: vi.fn() }) }));

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  vi.mocked(signOut).mockClear();
  vi.mocked(exitDemo).mockClear();
});

test("un miembro puede cerrar sesión", async () => {
  render(<UserMenu user={{ id: "u1", name: "Ana Pérez", email: "ana@a.com" }} mode="member" />);
  await userEvent.click(screen.getByRole("button", { name: /Cuenta de Ana Pérez/ }));
  expect(screen.getByText("ana@a.com")).toBeVisible();
  await userEvent.click(await screen.findByRole("menuitem", { name: /Cerrar sesión/ }));
  expect(signOut).toHaveBeenCalledTimes(1);
  expect(exitDemo).not.toHaveBeenCalled();
});

test("el visitante de la demo sale de la demo, sin cierre de sesión", async () => {
  render(<UserMenu user={{ id: "demo", name: "Visitante", email: "" }} mode="demo" />);
  await userEvent.click(screen.getByRole("button", { name: /Cuenta de Visitante/ }));
  expect(screen.queryByRole("menuitem", { name: /Cerrar sesión/ })).toBeNull();
  await userEvent.click(await screen.findByRole("menuitem", { name: /Salir de la demo/ }));
  expect(exitDemo).toHaveBeenCalledTimes(1);
  expect(signOut).not.toHaveBeenCalled();
});
