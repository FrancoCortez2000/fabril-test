// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { TableParams } from "@/components/data-table/params";
import { AccessProvider } from "@/components/layout/access-provider";
import { saveEmployee } from "@/features/employees/actions";
import { EmployeeDialog } from "@/features/employees/components/employee-dialog";
import { EmployeesTable } from "@/features/employees/components/employees-table";
import type { EmployeeRow } from "@/features/employees/types";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh }),
  usePathname: () => "/app/empleados",
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/employees/actions", () => ({ saveEmployee: vi.fn() }));

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
  vi.mocked(saveEmployee).mockReset();
  refresh.mockClear();
});

const AREAS = [{ id: "22222222-2222-4222-8222-222222222222", name: "Inyección" }];
const emp = (over: Partial<EmployeeRow> = {}): EmployeeRow => ({
  id: "11111111-1111-4111-8111-111111111111",
  firstName: "Lucía",
  lastName: "Fernández",
  name: "Lucía Fernández",
  position: "Operaria de inyectora",
  areaId: AREAS[0]!.id,
  areaName: "Inyección",
  status: "active",
  hourlyCost: 6200.5,
  ...over,
});
const params: TableParams = { page: 1, pageSize: 25, sort: null, q: "", filters: {} };

const wrap = (
  ui: React.ReactNode,
  role: "admin" | null = "admin",
  mode: "member" | "demo" = "member",
) => (
  <AccessProvider role={role} mode={mode}>
    {ui}
  </AccessProvider>
);

function renderTable(
  rows = [emp()],
  role: "admin" | null = "admin",
  mode: "member" | "demo" = "member",
) {
  return render(
    wrap(
      <EmployeesTable rows={rows} total={rows.length} params={params} areas={AREAS} />,
      role,
      mode,
    ),
  );
}

describe("EmployeesTable", () => {
  test("muestra nombre, cargo, área, estado y costo por hora", () => {
    renderTable();
    expect(screen.getAllByText("Lucía Fernández").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Operaria de inyectora").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inyección").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Activo").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/6\.200,50/).length).toBeGreaterThan(0);
  });

  test("lo que falta se muestra como guion", () => {
    renderTable([emp({ position: null, areaName: null, hourlyCost: null })]);
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  test("el estado se dice con texto", () => {
    renderTable([emp({ status: "on_leave" }), emp({ id: "x2", status: "inactive" })]);
    expect(screen.getAllByText("De licencia").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inactivo").length).toBeGreaterThan(0);
  });

  test("sin empleados muestra el estado vacío", () => {
    renderTable([]);
    expect(screen.getByText("Todavía no hay empleados")).toBeVisible();
  });

  test("el administrador ve Nuevo empleado y puede editar", async () => {
    renderTable();
    expect(screen.getByRole("button", { name: "Nuevo empleado" })).toBeEnabled();
    await userEvent.click(screen.getAllByRole("button", { name: /Editar a Lucía Fernández/ })[0]!);
    expect(await screen.findByRole("heading", { name: "Editar empleado" })).toBeVisible();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Lucía");
  });

  test("en la demo no se muestra el costo por hora (dato personal)", () => {
    renderTable([emp()], null, "demo");
    expect(screen.queryByText("Costo por hora")).toBeNull();
    expect(screen.queryByText(/6.200,50/)).toBeNull();
  });

  test("en la demo se ve la lista pero Nuevo empleado y editar quedan deshabilitados", () => {
    renderTable([emp()], null, "demo");
    expect(screen.getByRole("button", { name: "Nuevo empleado" })).toBeDisabled();
    for (const b of screen.getAllByRole("button", { name: /Editar a Lucía Fernández/ })) {
      expect(b).toBeDisabled();
    }
  });
});

describe("EmployeeDialog", () => {
  const open = (
    employee: EmployeeRow | null = null,
    role: "admin" | null = "admin",
    mode: "member" | "demo" = "member",
  ) => {
    const onOpenChange = vi.fn();
    render(
      wrap(
        <EmployeeDialog open onOpenChange={onOpenChange} employee={employee} areas={AREAS} />,
        role,
        mode,
      ),
    );
    return onOpenChange;
  };

  test("alta: pide nombre y apellido antes de enviar", async () => {
    open();
    expect(screen.getByRole("heading", { name: "Nuevo empleado" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Guardar empleado" }));
    expect((await screen.findAllByText(/obligatori|Ingresá/i)).length).toBeGreaterThan(0);
    expect(saveEmployee).not.toHaveBeenCalled();
  });

  test("alta: guarda, avisa, cierra y refresca", async () => {
    vi.mocked(saveEmployee).mockResolvedValue({ ok: true, data: { id: "n" } });
    const onOpenChange = open();
    await userEvent.type(screen.getByLabelText("Nombre"), "Diego");
    await userEvent.type(screen.getByLabelText("Apellido"), "Acosta");
    await userEvent.type(screen.getByLabelText(/Cargo/), "Operario");
    await userEvent.click(screen.getByRole("button", { name: "Guardar empleado" }));
    await vi.waitFor(() =>
      expect(saveEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "Diego",
          lastName: "Acosta",
          position: "Operario",
          status: "active",
        }),
      ),
    );
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(refresh).toHaveBeenCalled();
  });

  test("edición: precarga los datos y manda el id", async () => {
    vi.mocked(saveEmployee).mockResolvedValue({ ok: true, data: { id: "x" } });
    open(emp());
    expect(screen.getByRole("heading", { name: "Editar empleado" })).toBeVisible();
    expect(screen.getByLabelText("Apellido")).toHaveValue("Fernández");
    await userEvent.click(screen.getByRole("button", { name: "Guardar empleado" }));
    await vi.waitFor(() =>
      expect(saveEmployee).toHaveBeenCalledWith(
        expect.objectContaining({ id: "11111111-1111-4111-8111-111111111111", hourlyCost: 6200.5 }),
      ),
    );
  });

  test("si el servidor rechaza muestra el motivo y no cierra", async () => {
    vi.mocked(saveEmployee).mockResolvedValue({
      ok: false,
      error: "No encontramos esa área en esta fábrica",
    });
    const onOpenChange = open(emp());
    await userEvent.click(screen.getByRole("button", { name: "Guardar empleado" }));
    expect(await screen.findByText(/No encontramos esa área/)).toBeVisible();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  test("doble envío: el botón se deshabilita mientras guarda", async () => {
    let resolve: (v: { ok: true; data: { id: string } }) => void = () => {};
    vi.mocked(saveEmployee).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    open(emp());
    await userEvent.click(screen.getByRole("button", { name: "Guardar empleado" }));
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: /Guardar empleado/ })).toBeDisabled(),
    );
    await userEvent.click(screen.getByRole("button", { name: /Guardar empleado/ }));
    expect(saveEmployee).toHaveBeenCalledTimes(1);
    resolve({ ok: true, data: { id: "x" } });
  });

  test("el costo por hora no acepta negativos", async () => {
    open(emp());
    const cost = screen.getByLabelText(/Costo por hora/);
    await userEvent.clear(cost);
    await userEvent.type(cost, "-5");
    await userEvent.click(screen.getByRole("button", { name: "Guardar empleado" }));
    expect(saveEmployee).not.toHaveBeenCalled();
  });

  test("en la demo el formulario abre pero guardar queda bloqueado", () => {
    open(emp(), null, "demo");
    const btn = screen.getByRole("button", { name: "No disponible en la demo" });
    expect(btn).toBeDisabled();
    expect(within(document.body).queryByRole("button", { name: "Guardar empleado" })).toBeNull();
  });
});
