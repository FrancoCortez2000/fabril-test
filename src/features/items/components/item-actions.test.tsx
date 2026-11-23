// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AccessProvider } from "@/components/layout/access-provider";
import { setItemArchived } from "@/features/items/actions";
import { ItemActions } from "@/features/items/components/item-actions";
import { productRow } from "@/features/items/test-fixtures";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/features/items/actions", () => ({ saveItem: vi.fn(), setItemArchived: vi.fn() }));

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  vi.mocked(setItemArchived).mockReset();
  refresh.mockClear();
});

const renderActions = (role: "admin" | null, mode: "member" | "demo", archived = false) =>
  render(
    <AccessProvider role={role} mode={mode}>
      <ItemActions item={{ ...productRow, archived }} categories={[]} suppliers={[]} />
    </AccessProvider>,
  );

test("Editar abre el formulario con los datos del ítem", async () => {
  renderActions("admin", "member");
  await userEvent.click(screen.getByRole("button", { name: "Editar" }));
  expect(await screen.findByRole("heading", { name: "Editar producto" })).toBeVisible();
  expect(screen.getByLabelText("Nombre")).toHaveValue("Bidón 5 L");
});

test("archivar pide confirmación y llama a la acción", async () => {
  vi.mocked(setItemArchived).mockResolvedValue({ ok: true, data: null });
  renderActions("admin", "member");
  await userEvent.click(screen.getByRole("button", { name: "Archivar" }));
  await userEvent.click(await screen.findByRole("button", { name: "Archivar producto" }));
  await vi.waitFor(() =>
    expect(setItemArchived).toHaveBeenCalledWith({ id: productRow.id, archived: true }),
  );
  await vi.waitFor(() => expect(refresh).toHaveBeenCalled());
});

test("un ítem archivado se reactiva", async () => {
  vi.mocked(setItemArchived).mockResolvedValue({ ok: true, data: null });
  renderActions("admin", "member", true);
  await userEvent.click(screen.getByRole("button", { name: "Reactivar" }));
  await vi.waitFor(() =>
    expect(setItemArchived).toHaveBeenCalledWith({ id: productRow.id, archived: false }),
  );
});

test("si la acción falla, no se refresca", async () => {
  vi.mocked(setItemArchived).mockResolvedValue({ ok: false, error: "No pudimos" });
  renderActions("admin", "member");
  await userEvent.click(screen.getByRole("button", { name: "Archivar" }));
  await userEvent.click(await screen.findByRole("button", { name: "Archivar producto" }));
  await vi.waitFor(() => expect(setItemArchived).toHaveBeenCalled());
  expect(refresh).not.toHaveBeenCalled();
});

test("en la demo se puede abrir Editar pero archivar queda deshabilitado", async () => {
  renderActions(null, "demo");
  expect(screen.getByRole("button", { name: "Archivar" })).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "Editar" }));
  expect(await screen.findByRole("button", { name: "No disponible en la demo" })).toBeDisabled();
  expect(setItemArchived).not.toHaveBeenCalled();
});
