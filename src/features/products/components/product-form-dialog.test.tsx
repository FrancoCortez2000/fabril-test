// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { toast } from "sonner";

import { ProductFormDialog } from "@/features/products/components/product-form-dialog";

vi.mock("sonner", () => ({ toast: { info: vi.fn() } }));

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => vi.mocked(toast.info).mockClear());

async function fillRequired() {
  await userEvent.type(screen.getByLabelText("Nombre"), "Bidón 10 L rojo");
  await userEvent.type(screen.getByLabelText("SKU"), "BID-10L-RJ");
}

test("un número inválido bloquea el envío y muestra el error", async () => {
  render(<ProductFormDialog open onOpenChange={() => {}} categories={[]} />);
  await fillRequired();
  await userEvent.type(screen.getByLabelText("Stock mínimo"), "abc");
  await userEvent.click(screen.getByRole("button", { name: "Crear producto" }));

  expect(await screen.findByText("Ingresá el stock mínimo como número")).toBeInTheDocument();
  expect(toast.info).not.toHaveBeenCalled();
});

test("Enter valida el valor recién tipeado, aunque el campo no haya perdido el foco", async () => {
  render(<ProductFormDialog open onOpenChange={() => {}} categories={[]} />);
  await fillRequired();
  const minStock = screen.getByLabelText("Stock mínimo");
  await userEvent.clear(minStock);
  await userEvent.type(minStock, "-5{Enter}");

  expect(await screen.findByText("El stock mínimo no puede ser negativo")).toBeInTheDocument();
  expect(toast.info).not.toHaveBeenCalled();
});

test("al abrir, el foco queda en el nombre", async () => {
  render(<ProductFormDialog open onOpenChange={() => {}} categories={[]} />);
  expect(await screen.findByLabelText("Nombre")).toHaveFocus();
});

function Opener() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir formulario
      </button>
      <ProductFormDialog open={open} onOpenChange={setOpen} categories={[]} />
    </>
  );
}

test("al cerrar con Esc, el foco vuelve al botón que abrió el formulario", async () => {
  render(<Opener />);
  const opener = screen.getByRole("button", { name: "Abrir formulario" });
  await userEvent.click(opener);
  await screen.findByRole("dialog");
  await userEvent.keyboard("{Escape}");
  await vi.waitFor(() => expect(opener).toHaveFocus());
});
