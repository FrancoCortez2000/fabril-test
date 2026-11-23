// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AccessProvider } from "@/components/layout/access-provider";
import {
  cancelOrder,
  completeOrder,
  createPurchaseFromShortages,
  reportProgress,
} from "@/features/production/actions";
import { CancelOrderDialog } from "@/features/production/components/cancel-dialog";
import { CompleteDialog } from "@/features/production/components/complete-dialog";
import { ProgressDialog } from "@/features/production/components/progress-dialog";
import { ShortageDialog } from "@/features/production/components/shortage-dialog";
import { materials, OP_ID, orderFull } from "@/features/production/test-fixtures";

const refresh = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/production/actions", () => ({
  startOrder: vi.fn(),
  reportProgress: vi.fn(),
  completeOrder: vi.fn(),
  cancelOrder: vi.fn(),
  createPurchaseFromShortages: vi.fn(),
}));

const SUPPLIER = "22222222-2222-4222-8222-222222222222";

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
  vi.mocked(reportProgress).mockReset();
  vi.mocked(completeOrder).mockReset();
  vi.mocked(cancelOrder).mockReset();
  vi.mocked(createPurchaseFromShortages).mockReset();
  refresh.mockClear();
  push.mockClear();
});

const wrap = (
  ui: React.ReactNode,
  role: "admin" | null = "admin",
  mode: "member" | "demo" = "member",
) => (
  <AccessProvider role={role} mode={mode}>
    {ui}
  </AccessProvider>
);

/** Controla una promesa para probar el doble envío. */
function deferred<T>() {
  let resolve: (v: T) => void = () => {};
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("ProgressDialog", () => {
  const open = (role: "admin" | null = "admin", mode: "member" | "demo" = "member") => {
    const onOpenChange = vi.fn();
    render(
      wrap(
        <ProgressDialog
          open
          onOpenChange={onOpenChange}
          order={orderFull({ status: "in_progress" })}
        />,
        role,
        mode,
      ),
    );
    return onOpenChange;
  };

  test("pide unidades buenas, defectuosas y notas", () => {
    open();
    expect(screen.getByRole("heading", { name: "Registrar avance" })).toBeVisible();
    expect(screen.getByLabelText(/Unidades buenas/)).toBeVisible();
    expect(screen.getByLabelText(/Unidades defectuosas/)).toBeVisible();
    expect(screen.getByLabelText(/Notas/)).toBeVisible();
  });

  test("con todo en cero no se envía y lo explica", async () => {
    open();
    await userEvent.click(screen.getByRole("button", { name: "Registrar avance" }));
    expect(await screen.findByText(/Indicá unidades buenas o defectuosas/)).toBeVisible();
    expect(reportProgress).not.toHaveBeenCalled();
  });

  test("guarda el parte, avisa, cierra y refresca", async () => {
    vi.mocked(reportProgress).mockResolvedValue({ ok: true, data: null });
    const onOpenChange = open();
    await userEvent.type(screen.getByLabelText(/Unidades buenas/), "40");
    await userEvent.type(screen.getByLabelText(/Unidades defectuosas/), "2");
    await userEvent.type(screen.getByLabelText(/Notas/), "Primer turno");
    await userEvent.click(screen.getByRole("button", { name: "Registrar avance" }));
    await vi.waitFor(() =>
      expect(reportProgress).toHaveBeenCalledWith({
        id: OP_ID,
        good: 40,
        defective: 2,
        notes: "Primer turno",
      }),
    );
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(refresh).toHaveBeenCalled();
  });

  test("si el servidor rechaza, muestra el motivo y no cierra", async () => {
    vi.mocked(reportProgress).mockResolvedValue({
      ok: false,
      error: "La orden OP-2026-0056 no está en producción",
    });
    const onOpenChange = open();
    await userEvent.type(screen.getByLabelText(/Unidades buenas/), "10");
    await userEvent.click(screen.getByRole("button", { name: "Registrar avance" }));
    expect(await screen.findByText(/no está en producción/)).toBeVisible();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  test("el botón se deshabilita mientras guarda (doble envío)", async () => {
    const d = deferred<{ ok: true; data: null }>();
    vi.mocked(reportProgress).mockReturnValue(d.promise);
    open();
    await userEvent.type(screen.getByLabelText(/Unidades buenas/), "10");
    await userEvent.click(screen.getByRole("button", { name: "Registrar avance" }));
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: /Registrar avance/ })).toBeDisabled(),
    );
    await userEvent.click(screen.getByRole("button", { name: /Registrar avance/ }));
    expect(reportProgress).toHaveBeenCalledTimes(1);
    d.resolve({ ok: true, data: null });
  });

  test("en la demo se completa pero guardar queda bloqueado", () => {
    open(null, "demo");
    expect(screen.getByRole("button", { name: "No disponible en la demo" })).toBeDisabled();
  });
});

describe("CompleteDialog", () => {
  const open = (
    order = orderFull({ status: "in_progress", goodQty: 300, defectiveQty: 12 }),
    role: "admin" | null = "admin",
    mode: "member" | "demo" = "member",
  ) => {
    const onOpenChange = vi.fn();
    render(wrap(<CompleteDialog open onOpenChange={onOpenChange} order={order} />, role, mode));
    return onOpenChange;
  };

  test("precarga lo producido hasta ahora", () => {
    open();
    expect(screen.getByLabelText(/Unidades buenas finales/)).toHaveValue("300");
    expect(screen.getByLabelText(/Unidades defectuosas finales/)).toHaveValue("12");
  });

  test("sin partes de avance precarga lo planificado", () => {
    open(orderFull({ status: "quality_check", goodQty: 0, defectiveQty: 0, plannedQty: 900 }));
    expect(screen.getByLabelText(/Unidades buenas finales/)).toHaveValue("900");
  });

  test("completa con las cantidades finales y la nota, avisa y refresca", async () => {
    vi.mocked(completeOrder).mockResolvedValue({ ok: true, data: null });
    const onOpenChange = open();
    const good = screen.getByLabelText(/Unidades buenas finales/);
    await userEvent.clear(good);
    await userEvent.type(good, "880");
    await userEvent.type(screen.getByLabelText(/Nota/), "Sin novedades");
    await userEvent.click(screen.getByRole("button", { name: "Completar orden" }));
    await vi.waitFor(() =>
      expect(completeOrder).toHaveBeenCalledWith({
        id: OP_ID,
        good: 880,
        defective: 12,
        note: "Sin novedades",
      }),
    );
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(refresh).toHaveBeenCalled();
  });

  test("si el segundo paso falla muestra el error y la orden puede volver a completarse", async () => {
    vi.mocked(completeOrder).mockResolvedValue({
      ok: false,
      error:
        "No se pudo completar. La orden quedó en control de calidad; podés volver a completarla.",
    });
    const onOpenChange = open();
    await userEvent.click(screen.getByRole("button", { name: "Completar orden" }));
    expect(await screen.findByText(/quedó en control de calidad/)).toBeVisible();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  test("las cantidades negativas se rechazan", async () => {
    open();
    const good = screen.getByLabelText(/Unidades buenas finales/);
    await userEvent.clear(good);
    await userEvent.type(good, "-5");
    await userEvent.click(screen.getByRole("button", { name: "Completar orden" }));
    expect(await screen.findByText(/no puede ser negativa/)).toBeVisible();
    expect(completeOrder).not.toHaveBeenCalled();
  });

  test("doble envío: el botón se deshabilita mientras corre", async () => {
    const d = deferred<{ ok: true; data: null }>();
    vi.mocked(completeOrder).mockReturnValue(d.promise);
    open();
    await userEvent.click(screen.getByRole("button", { name: "Completar orden" }));
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: /Completar orden/ })).toBeDisabled(),
    );
    await userEvent.click(screen.getByRole("button", { name: /Completar orden/ }));
    expect(completeOrder).toHaveBeenCalledTimes(1);
    d.resolve({ ok: true, data: null });
  });

  test("en la demo guardar queda bloqueado", () => {
    open(orderFull({ status: "in_progress" }), null, "demo");
    expect(screen.getByRole("button", { name: "No disponible en la demo" })).toBeDisabled();
  });
});

describe("CancelOrderDialog", () => {
  const open = (role: "admin" | null = "admin", mode: "member" | "demo" = "member") => {
    const onOpenChange = vi.fn();
    render(
      wrap(
        <CancelOrderDialog
          open
          onOpenChange={onOpenChange}
          order={orderFull({ status: "planned" })}
        />,
        role,
        mode,
      ),
    );
    return onOpenChange;
  };

  test("pide el motivo antes de cancelar", async () => {
    open();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar la orden" }));
    expect(await screen.findByText("Indicá el motivo de la cancelación")).toBeVisible();
    expect(cancelOrder).not.toHaveBeenCalled();
  });

  test("cancela con el motivo, avisa y refresca", async () => {
    vi.mocked(cancelOrder).mockResolvedValue({ ok: true, data: null });
    const onOpenChange = open();
    await userEvent.type(screen.getByLabelText(/Motivo/), "Falta de materia prima");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar la orden" }));
    await vi.waitFor(() =>
      expect(cancelOrder).toHaveBeenCalledWith({ id: OP_ID, reason: "Falta de materia prima" }),
    );
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(refresh).toHaveBeenCalled();
  });

  test("si el servidor rechaza muestra el motivo", async () => {
    vi.mocked(cancelOrder).mockResolvedValue({
      ok: false,
      error: "La orden no se puede cancelar en su estado actual",
    });
    open();
    await userEvent.type(screen.getByLabelText(/Motivo/), "Falta de materia prima");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar la orden" }));
    expect(await screen.findByText(/no se puede cancelar en su estado actual/)).toBeVisible();
    expect(refresh).not.toHaveBeenCalled();
  });

  test("en la demo guardar queda bloqueado", () => {
    open(null, "demo");
    expect(screen.getByRole("button", { name: "No disponible en la demo" })).toBeDisabled();
  });
});

describe("ShortageDialog", () => {
  const short = [{ ...materials[0]!, available: -12.5 }, materials[1]!];
  const open = (role: "admin" | null = "admin", mode: "member" | "demo" = "member") => {
    const onOpenChange = vi.fn();
    render(
      wrap(
        <ShortageDialog
          open
          onOpenChange={onOpenChange}
          order={orderFull({ status: "planned" })}
          materials={short}
          suppliers={[{ id: SUPPLIER, name: "Petroquímica Sur" }]}
        />,
        role,
        mode,
      ),
    );
    return onOpenChange;
  };

  test("lista sólo los materiales que faltan y cuánto", () => {
    open();
    expect(screen.getByRole("heading", { name: "Crear compra con faltantes" })).toBeVisible();
    expect(screen.getByText("Polipropileno copolímero")).toBeVisible();
    expect(screen.getByText(/12,5 kg/)).toBeVisible();
    expect(screen.queryByText("Masterbatch rojo")).toBeNull();
  });

  test("sin proveedor elegido no se envía", async () => {
    open();
    await userEvent.click(screen.getByRole("button", { name: "Crear compra" }));
    expect(await screen.findByText(/Elegí un proveedor/)).toBeVisible();
    expect(createPurchaseFromShortages).not.toHaveBeenCalled();
  });

  test("crea la compra y navega a su ficha", async () => {
    vi.mocked(createPurchaseFromShortages).mockResolvedValue({
      ok: true,
      data: { id: "po-9" } as never,
    });
    open();
    await userEvent.click(screen.getByRole("combobox", { name: /Proveedor/ }));
    await userEvent.click(await screen.findByRole("option", { name: /Petroquímica Sur/ }));
    await userEvent.click(screen.getByRole("button", { name: "Crear compra" }));
    await vi.waitFor(() =>
      expect(createPurchaseFromShortages).toHaveBeenCalledWith({
        orderId: OP_ID,
        supplierId: SUPPLIER,
      }),
    );
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/app/compras/po-9"));
  });

  test("si el servidor rechaza muestra el motivo y no navega", async () => {
    vi.mocked(createPurchaseFromShortages).mockResolvedValue({
      ok: false,
      error: "Esta orden no tiene faltantes de material",
    });
    open();
    await userEvent.click(screen.getByRole("combobox", { name: /Proveedor/ }));
    await userEvent.click(await screen.findByRole("option", { name: /Petroquímica Sur/ }));
    await userEvent.click(screen.getByRole("button", { name: "Crear compra" }));
    expect(await screen.findByText(/no tiene faltantes/)).toBeVisible();
    expect(push).not.toHaveBeenCalled();
  });

  test("en la demo guardar queda bloqueado", () => {
    open(null, "demo");
    expect(screen.getByRole("button", { name: "No disponible en la demo" })).toBeDisabled();
  });
});
