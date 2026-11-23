// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AccessProvider } from "@/components/layout/access-provider";
import { saveBom } from "@/features/items/bom-actions";
import { BomEditorDialog } from "@/features/items/components/bom-editor-dialog";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/items/bom-actions", () => ({ saveBom: vi.fn() }));

const ITEM = "11111111-1111-4111-8111-111111111111";
const PEAD = "22222222-2222-4222-8222-222222222222";
const MB = "33333333-3333-4333-8333-333333333333";
const MATERIALS = [
  { id: PEAD, name: "PEAD", unitCode: "kg" },
  { id: MB, name: "Masterbatch", unitCode: "kg" },
];

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
});

beforeEach(() => {
  vi.mocked(saveBom).mockReset();
  refresh.mockClear();
});

const initial = {
  outputQty: 10,
  defaultWastePct: null,
  notes: "",
  lines: [{ componentItemId: PEAD, quantity: 5, wastePct: null }],
};

function dialog(
  role: "admin" | null,
  mode: "member" | "demo",
  over: Partial<React.ComponentProps<typeof BomEditorDialog>> = {},
) {
  return render(
    <AccessProvider role={role} mode={mode}>
      <BomEditorDialog
        open
        onOpenChange={() => {}}
        itemId={ITEM}
        initialValues={initial}
        materials={MATERIALS}
        {...over}
      />
    </AccessProvider>,
  );
}

test("muestra las líneas de la receta con su materia prima y cantidad", () => {
  dialog("admin", "member");
  expect(screen.getByRole("heading", { name: "Editar receta" })).toBeVisible();
  expect(screen.getByRole("combobox", { name: /Materia prima 1/ })).toHaveTextContent("PEAD");
  expect(screen.getByLabelText(/Cantidad de la línea 1/)).toHaveValue("5");
});

test("agregar una línea no ofrece las materias primas que ya están en la receta", async () => {
  dialog("admin", "member");
  await userEvent.click(screen.getByRole("button", { name: /Agregar materia prima/ }));
  await userEvent.click(screen.getByRole("combobox", { name: /Materia prima 2/ }));
  const list = await screen.findByRole("listbox");
  expect(within(list).getByRole("option", { name: /Masterbatch/ })).toBeVisible();
  expect(within(list).queryByRole("option", { name: /PEAD/ })).toBeNull();
});

test("guarda con los datos del formulario, avisa y refresca", async () => {
  vi.mocked(saveBom).mockResolvedValue({ ok: true, data: { id: "b1" } });
  const onOpenChange = vi.fn();
  dialog("admin", "member", { onOpenChange });
  await userEvent.click(screen.getByRole("button", { name: "Guardar receta" }));
  await vi.waitFor(() => expect(saveBom).toHaveBeenCalledTimes(1));
  expect(saveBom).toHaveBeenCalledWith({
    itemId: ITEM,
    outputQty: 10,
    defaultWastePct: null,
    notes: "",
    lines: [{ componentItemId: PEAD, quantity: 5, wastePct: null }],
  });
  await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  expect(refresh).toHaveBeenCalled();
});

test("si el servidor rechaza, muestra el motivo y no cierra", async () => {
  vi.mocked(saveBom).mockResolvedValue({
    ok: false,
    error: "No repitas una materia prima en la receta",
  });
  const onOpenChange = vi.fn();
  dialog("admin", "member", { onOpenChange });
  await userEvent.click(screen.getByRole("button", { name: "Guardar receta" }));
  expect(await screen.findByText(/No repitas una materia prima/)).toBeVisible();
  expect(onOpenChange).not.toHaveBeenCalledWith(false);
});

test("una receta sin líneas no se envía y lo explica", async () => {
  dialog("admin", "member", { initialValues: { ...initial, lines: [] } });
  await userEvent.click(screen.getByRole("button", { name: "Guardar receta" }));
  expect(await screen.findByText("La receta necesita al menos una materia prima")).toBeVisible();
  expect(saveBom).not.toHaveBeenCalled();
});

test("en la demo se abre y se edita, pero guardar queda bloqueado", async () => {
  dialog(null, "demo");
  expect(screen.getByRole("button", { name: "No disponible en la demo" })).toBeDisabled();
  expect(saveBom).not.toHaveBeenCalled();
});

test("sin receta previa el título es de alta", () => {
  dialog("admin", "member", { initialValues: null });
  expect(screen.getByRole("heading", { name: "Crear receta" })).toBeVisible();
});
