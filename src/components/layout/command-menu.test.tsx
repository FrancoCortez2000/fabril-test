// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AccessProvider } from "@/components/layout/access-provider";
import { CommandMenu } from "@/components/layout/command-menu";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next-themes", () => ({ useTheme: () => ({ setTheme: vi.fn() }) }));

const fetchMock = vi.fn();
beforeEach(() => {
  push.mockClear();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ hits: [] }) });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

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

describe("búsqueda de registros", () => {
  const HITS = [
    {
      kind: "product",
      id: "p1",
      title: "Balde 10 L rojo",
      detail: "BAL-10L",
      href: "/app/productos/p1",
    },
    { kind: "order", id: "o1", title: "OP-2026-0001", detail: "Balde", href: "/app/produccion/o1" },
  ];

  async function open() {
    render(<CommandMenu />);
    await userEvent.click(screen.getByRole("button", { name: /Buscar/ }));
    return screen.findByPlaceholderText(/Escribí/);
  }

  test("al escribir 2 letras busca y muestra los resultados agrupados; elegir uno navega", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ hits: HITS }) });
    await userEvent.type(await open(), "bal");
    expect(await screen.findByRole("option", { name: /Balde 10 L rojo/ })).toBeVisible();
    expect(screen.getByText("Productos")).toBeVisible();
    expect(screen.getByText("Órdenes")).toBeVisible();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/app/buscar?q=bal",
      expect.objectContaining({ signal: expect.anything() }),
    );
    await userEvent.click(screen.getByRole("option", { name: /OP-2026-0001/ }));
    expect(push).toHaveBeenCalledWith("/app/produccion/o1");
  });

  test("con menos de 2 letras no llama al servidor", async () => {
    await userEvent.type(await open(), "b");
    await new Promise((r) => setTimeout(r, 400));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("si la búsqueda falla el menú sigue andando", async () => {
    fetchMock.mockRejectedValue(new Error("sin red"));
    await userEvent.type(await open(), "inventario");
    await new Promise((r) => setTimeout(r, 400));
    expect(screen.getByRole("option", { name: /Inventario/ })).toBeVisible();
  });

  test("con resultados no aparece 'No hay coincidencias.'", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ hits: HITS }) });
    await userEvent.type(await open(), "balde");
    await screen.findByRole("option", { name: /Balde 10 L rojo/ });
    expect(screen.queryByText("No hay coincidencias.")).toBeNull();
  });

  test("Enter abre el primer resultado sin tener que bajar con la flecha", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ hits: HITS }) });
    await userEvent.type(await open(), "balde");
    await screen.findByRole("option", { name: /Balde 10 L rojo/ });
    await userEvent.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/app/productos/p1");
  });

  test("los módulos se filtran por lo escrito, sin tildes ni mayúsculas", async () => {
    await userEvent.type(await open(), "PRODUCCION");
    expect(await screen.findByRole("option", { name: /Producción/ })).toBeVisible();
    expect(screen.queryByRole("option", { name: /Inventario/ })).toBeNull();
  });

  test("sin resultados dice que no hay coincidencias", async () => {
    await userEvent.type(await open(), "zzzz");
    expect(await screen.findByText("No hay coincidencias.")).toBeVisible();
  });
});
