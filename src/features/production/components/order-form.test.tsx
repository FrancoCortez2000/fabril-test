// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AccessProvider } from "@/components/layout/access-provider";
import type { BomView } from "@/features/items/bom-queries";
import { createOrder } from "@/features/production/actions";
import { OrderForm } from "@/features/production/components/order-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/production/actions", () => ({ createOrder: vi.fn() }));

const WITH_BOM = "11111111-1111-4111-8111-111111111111";
const NO_BOM = "22222222-2222-4222-8222-222222222222";
const EMP = "33333333-3333-4333-8333-333333333333";

const products = [
  { id: WITH_BOM, name: "Balde 10 L", sku: "BAL-10L", unitCode: "u" },
  { id: NO_BOM, name: "Bidón nuevo", sku: "BID-NEW", unitCode: "u" },
];

const boms: Record<string, BomView> = {
  [WITH_BOM]: {
    outputQty: 10,
    defaultWastePct: null,
    orgWastePct: 3,
    notes: null,
    lines: [
      {
        itemId: "a",
        name: "PEAD",
        unitCode: "kg",
        quantity: 5,
        wastePct: null,
        avgCost: 1000,
        available: 280,
      },
      {
        itemId: "b",
        name: "Masterbatch",
        unitCode: "kg",
        quantity: 0.1,
        wastePct: 7,
        avgCost: 8000,
        available: 0.5,
      },
    ],
  },
};

const employees = [{ id: EMP, name: "Juan Sosa", position: "Operario" }];

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
  vi.mocked(createOrder).mockReset();
  push.mockClear();
});

function renderForm(role: "admin" | null = "admin", mode: "member" | "demo" = "member") {
  return render(
    <AccessProvider role={role} mode={mode}>
      <OrderForm products={products} boms={boms} employees={employees} />
    </AccessProvider>,
  );
}

async function pickProduct(name: RegExp) {
  await userEvent.click(screen.getByRole("combobox", { name: /Producto/ }));
  await userEvent.click(await screen.findByRole("option", { name }));
}

async function setQty(value: string) {
  const input = screen.getByLabelText(/Cantidad a fabricar/);
  await userEvent.clear(input);
  if (value) await userEvent.type(input, value);
}

test("al elegir un producto con receta muestra la vista previa de materiales", async () => {
  renderForm();
  await pickProduct(/Balde 10 L/);
  await setQty("100");
  expect(
    within(await screen.findByRole("row", { name: /PEAD/ })).getByText("51,5 kg"),
  ).toBeVisible();
});

test("al cambiar la cantidad la vista previa se recalcula en vivo", async () => {
  renderForm();
  await pickProduct(/Balde 10 L/);
  await setQty("100");
  expect(await screen.findByText("51,5 kg")).toBeVisible();
  await setQty("200");
  expect(await screen.findByText("103 kg")).toBeVisible();
});

test("marca los faltantes de materiales", async () => {
  renderForm();
  await pickProduct(/Balde 10 L/);
  await setQty("100");
  expect(await screen.findByText(/Faltan 1 materia prima/)).toBeVisible();
});

test("un producto sin receta lo explica y deshabilita el envío", async () => {
  renderForm();
  await pickProduct(/Bidón nuevo/);
  await setQty("10");
  expect(await screen.findByText("Este producto no tiene receta")).toBeVisible();
  expect(screen.getByRole("button", { name: "Planificar orden" })).toBeDisabled();
});

test("sin producto elegido el botón también queda deshabilitado", () => {
  renderForm();
  expect(screen.getByRole("button", { name: "Planificar orden" })).toBeDisabled();
});

test("guarda la orden y navega a su ficha", async () => {
  vi.mocked(createOrder).mockResolvedValue({ ok: true, data: { id: "op-9" } as never });
  renderForm();
  await pickProduct(/Balde 10 L/);
  await setQty("100");
  await userEvent.click(screen.getByRole("button", { name: "Planificar orden" }));
  await vi.waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
  expect(createOrder).toHaveBeenCalledWith({
    itemId: WITH_BOM,
    plannedQty: 100,
    plannedStart: null,
    plannedEnd: null,
    priority: "normal",
    responsibleId: null,
    notes: "",
  });
  await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/app/produccion/op-9"));
});

test("las fechas invertidas se rechazan antes de enviar", async () => {
  renderForm();
  await pickProduct(/Balde 10 L/);
  await setQty("100");
  await userEvent.type(screen.getByLabelText(/Inicio previsto/), "2026-11-30");
  await userEvent.type(screen.getByLabelText(/Fin previsto/), "2026-11-24");
  await userEvent.click(screen.getByRole("button", { name: "Planificar orden" }));
  expect(
    await screen.findByText("La fecha de fin no puede ser anterior a la de inicio"),
  ).toBeVisible();
  expect(createOrder).not.toHaveBeenCalled();
});

test("una cantidad en cero no se envía y lo explica", async () => {
  renderForm();
  await pickProduct(/Balde 10 L/);
  await setQty("0");
  await userEvent.click(screen.getByRole("button", { name: "Planificar orden" }));
  expect(
    await screen.findByText("La cantidad a fabricar tiene que ser mayor a cero"),
  ).toBeVisible();
  expect(createOrder).not.toHaveBeenCalled();
});

test("si el servidor rechaza, muestra el motivo y no navega", async () => {
  vi.mocked(createOrder).mockResolvedValue({
    ok: false,
    error: "El producto no tiene receta: cargala antes de planificar",
  });
  renderForm();
  await pickProduct(/Balde 10 L/);
  await setQty("100");
  await userEvent.click(screen.getByRole("button", { name: "Planificar orden" }));
  expect(await screen.findByText(/cargala antes de planificar/)).toBeVisible();
  expect(push).not.toHaveBeenCalled();
});

test("el botón se deshabilita mientras guarda (doble envío)", async () => {
  let release: (v: { ok: true; data: never }) => void = () => {};
  vi.mocked(createOrder).mockReturnValue(
    new Promise((resolve) => {
      release = resolve as typeof release;
    }),
  );
  renderForm();
  await pickProduct(/Balde 10 L/);
  await setQty("100");
  await userEvent.click(screen.getByRole("button", { name: "Planificar orden" }));
  await vi.waitFor(() =>
    expect(screen.getByRole("button", { name: /Planificar orden/ })).toBeDisabled(),
  );
  await userEvent.click(screen.getByRole("button", { name: /Planificar orden/ }));
  expect(createOrder).toHaveBeenCalledTimes(1);
  release({ ok: true, data: { id: "x" } as never });
});

describe("modo demo", () => {
  test("se completa y calcula en vivo, pero planificar queda bloqueado", async () => {
    renderForm(null, "demo");
    await pickProduct(/Balde 10 L/);
    await setQty("100");
    expect(await screen.findByText("51,5 kg")).toBeVisible();
    expect(screen.getByRole("button", { name: "No disponible en la demo" })).toBeDisabled();
    expect(createOrder).not.toHaveBeenCalled();
  });
});
