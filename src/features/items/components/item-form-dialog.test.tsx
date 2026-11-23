// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { toast } from "sonner";

import { AccessProvider } from "@/components/layout/access-provider";
import { saveItem } from "@/features/items/actions";
import { ItemFormDialog } from "@/features/items/components/item-form-dialog";
import type { ItemFormValues } from "@/features/items/schemas";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/items/actions", () => ({ saveItem: vi.fn() }));

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  vi.mocked(saveItem).mockReset();
  vi.mocked(toast.success).mockClear();
  refresh.mockClear();
});

const SUPPLIERS = [{ id: "22222222-2222-4222-8222-222222222222", name: "Petroquímica Sur" }];

function admin(ui: React.ReactNode) {
  return (
    <AccessProvider role="admin" mode="member">
      {ui}
    </AccessProvider>
  );
}

function dialog(over: Partial<React.ComponentProps<typeof ItemFormDialog>> = {}) {
  return (
    <ItemFormDialog
      open
      onOpenChange={() => {}}
      kind="finished_good"
      categories={[]}
      suppliers={SUPPLIERS}
      {...over}
    />
  );
}

async function fillRequired() {
  await userEvent.type(screen.getByLabelText("Nombre"), "Bidón 10 L rojo");
  await userEvent.type(screen.getByLabelText("SKU"), "bid-10l-rj");
}

test("un número inválido bloquea el envío y muestra el error", async () => {
  render(admin(dialog()));
  await fillRequired();
  await userEvent.type(screen.getByLabelText("Stock mínimo"), "abc");
  await userEvent.click(screen.getByRole("button", { name: "Crear producto" }));

  expect(await screen.findByText("Ingresá el stock mínimo como número")).toBeInTheDocument();
  expect(saveItem).not.toHaveBeenCalled();
});

test("Enter valida el valor recién tipeado, aunque el campo no haya perdido el foco", async () => {
  render(admin(dialog()));
  await fillRequired();
  const minStock = screen.getByLabelText("Stock mínimo");
  await userEvent.clear(minStock);
  await userEvent.type(minStock, "-5{Enter}");

  expect(await screen.findByText("El stock mínimo no puede ser negativo")).toBeInTheDocument();
  expect(saveItem).not.toHaveBeenCalled();
});

test("al abrir, el foco queda en el nombre", async () => {
  render(admin(dialog()));
  expect(await screen.findByLabelText("Nombre")).toHaveFocus();
});

function Opener() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir formulario
      </button>
      <ItemFormDialog
        open={open}
        onOpenChange={setOpen}
        kind="finished_good"
        categories={[]}
        suppliers={[]}
      />
    </>
  );
}

test("al cerrar con Esc, el foco vuelve al botón que abrió el formulario", async () => {
  render(admin(<Opener />));
  const opener = screen.getByRole("button", { name: "Abrir formulario" });
  await userEvent.click(opener);
  await screen.findByRole("dialog");
  await userEvent.keyboard("{Escape}");
  await vi.waitFor(() => expect(opener).toHaveFocus());
});

test("guarda un producto nuevo con los datos del formulario, avisa y refresca", async () => {
  vi.mocked(saveItem).mockResolvedValue({ ok: true, data: { id: "i1" } });
  const onOpenChange = vi.fn();
  render(admin(dialog({ onOpenChange })));
  await fillRequired();
  await userEvent.click(screen.getByRole("button", { name: "Crear producto" }));

  await vi.waitFor(() => expect(saveItem).toHaveBeenCalledTimes(1));
  expect(saveItem).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: "finished_good",
      name: "Bidón 10 L rojo",
      sku: "BID-10L-RJ",
      unitCode: "u",
      minStock: 0,
      status: "active",
    }),
  );
  expect(vi.mocked(saveItem).mock.calls[0]?.[0]).not.toHaveProperty("id");
  expect(vi.mocked(saveItem).mock.calls[0]?.[0]).not.toHaveProperty("manualCost");
  await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  expect(toast.success).toHaveBeenCalled();
  expect(refresh).toHaveBeenCalled();
});

test("si el servidor rechaza, muestra el motivo y deja el formulario abierto", async () => {
  vi.mocked(saveItem).mockResolvedValue({
    ok: false,
    error: "Ya existe un registro con ese dato (por ejemplo, el mismo SKU)",
  });
  const onOpenChange = vi.fn();
  render(admin(dialog({ onOpenChange })));
  await fillRequired();
  await userEvent.click(screen.getByRole("button", { name: "Crear producto" }));

  expect(await screen.findByText(/el mismo SKU/)).toBeVisible();
  expect(onOpenChange).not.toHaveBeenCalledWith(false);
  expect(refresh).not.toHaveBeenCalled();
});

test("editar manda el id y usa los textos de edición", async () => {
  vi.mocked(saveItem).mockResolvedValue({ ok: true, data: { id: "i1" } });
  const values: ItemFormValues & { id: string } = {
    id: "11111111-1111-4111-8111-111111111111",
    kind: "finished_good",
    name: "Bidón 5 L",
    sku: "BID-5L",
    description: "",
    categoryId: null,
    unitCode: "u",
    minStock: 10,
    status: "active",
    salePrice: 2850,
    standardLaborMinutes: 15,
    overheadPerUnit: 20,
    preferredSupplierId: null,
  };
  render(admin(dialog({ initialValues: values })));
  expect(screen.getByRole("heading", { name: "Editar producto" })).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  await vi.waitFor(() => expect(saveItem).toHaveBeenCalledTimes(1));
  expect(saveItem).toHaveBeenCalledWith(expect.objectContaining({ id: values.id }));
});

describe("modo demo", () => {
  test("se puede abrir y completar, pero guardar queda bloqueado y lo explica", async () => {
    render(
      <AccessProvider role={null} mode="demo">
        {dialog()}
      </AccessProvider>,
    );
    await fillRequired();
    const button = screen.getByRole("button", { name: "No disponible en la demo" });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Stock mínimo"), "{Enter}");
    expect(saveItem).not.toHaveBeenCalled();
  });
});

describe("campos según el tipo", () => {
  test("el producto pide precio, minutos de mano de obra e indirectos; no hay costo manual", () => {
    render(admin(dialog()));
    expect(screen.getByLabelText(/Precio de venta/)).toBeVisible();
    expect(screen.getByLabelText(/Minutos de mano de obra/)).toBeVisible();
    expect(screen.getByLabelText(/Gastos indirectos/)).toBeVisible();
    expect(screen.queryByLabelText(/Costo estimado/)).toBeNull();
    expect(screen.queryByLabelText(/Proveedor preferido/)).toBeNull();
    expect(screen.getByRole("button", { name: "Crear producto" })).toBeVisible();
  });

  test("la materia prima pide proveedor preferido y no precio ni mano de obra", () => {
    render(admin(dialog({ kind: "raw_material" })));
    expect(screen.getByText("Proveedor preferido")).toBeVisible();
    expect(screen.queryByLabelText(/Precio de venta/)).toBeNull();
    expect(screen.queryByLabelText(/Minutos de mano de obra/)).toBeNull();
    expect(screen.getByRole("button", { name: "Crear materia prima" })).toBeVisible();
  });

  test("con movimientos la unidad no se puede cambiar y se explica", () => {
    render(admin(dialog({ unitLocked: true })));
    expect(screen.getByRole("combobox", { name: /Unidad de medida/ })).toBeDisabled();
    expect(screen.getByText(/ya tiene movimientos/i)).toBeVisible();
  });
});
