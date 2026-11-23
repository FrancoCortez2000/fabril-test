// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { OrgSwitcher } from "@/components/layout/org-switcher";
import { switchOrganization } from "@/features/organizations/actions";

vi.mock("@/features/organizations/actions", () => ({ switchOrganization: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const orgs = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Mi Fábrica",
    isDemo: false,
    role: "admin" as const,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Plásticos del Litoral S.A.",
    isDemo: true,
    role: "admin" as const,
  },
];

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

test("cambia a la fábrica elegida", async () => {
  vi.mocked(switchOrganization).mockResolvedValue({ ok: true, data: null });
  render(<OrgSwitcher organizations={orgs} activeId={orgs[0]!.id} />);
  await userEvent.click(screen.getByRole("button", { name: /Fábrica activa: Mi Fábrica/ }));
  await userEvent.click(await screen.findByRole("menuitem", { name: /Plásticos del Litoral/ }));
  expect(switchOrganization).toHaveBeenCalledWith({ organizationId: orgs[1]!.id });
});

test("elegir la fábrica activa no hace nada", async () => {
  vi.mocked(switchOrganization).mockClear();
  render(<OrgSwitcher organizations={orgs} activeId={orgs[0]!.id} />);
  await userEvent.click(screen.getByRole("button", { name: /Fábrica activa: Mi Fábrica/ }));
  await userEvent.click(await screen.findByRole("menuitem", { name: /Mi Fábrica/ }));
  expect(switchOrganization).not.toHaveBeenCalled();
});

test("en modo sólo lectura muestra la fábrica sin desplegable", () => {
  render(<OrgSwitcher organizations={[orgs[1]!]} activeId={orgs[1]!.id} readOnly />);
  expect(screen.getByText("Plásticos del Litoral S.A.")).toBeVisible();
  expect(screen.queryByRole("button")).toBeNull();
});
