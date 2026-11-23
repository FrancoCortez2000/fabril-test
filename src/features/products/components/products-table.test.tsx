// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { TableParams } from "@/components/data-table/params";
import { ProductsTable } from "@/features/products/components/products-table";
import type { ItemRow } from "@/features/items/types";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/app/productos",
}));
vi.mock("sonner", () => ({ toast: { info: vi.fn() } }));

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const CAT = { id: "00000000-0000-4000-8000-000000000101", name: "Bidones" };
const params: TableParams = { page: 1, pageSize: 25, sort: null, q: "balde", filters: {} };

const row = (over: Partial<ItemRow> = {}): ItemRow => ({
  id: "00000000-0000-4000-8000-000000000001",
  sku: "BID-5L-AZ",
  name: "Bidón 5 L azul",
  description: "",
  category: CAT,
  unitCode: "u",
  currentStock: 3420,
  minStock: 1500,
  avgCost: 0,
  standardCost: 1186.4,
  cost: 1186.4,
  salePrice: 2850,
  status: "active",
  archived: false,
  level: "ok",
  ...over,
});

function renderTable(openNew: boolean, kind: "finished_good" | "raw_material" = "finished_good") {
  return (
    <ProductsTable
      kind={kind}
      rows={[
        row(),
        row({
          id: "00000000-0000-4000-8000-000000000002",
          sku: "BID-5L-NAT",
          name: "Bidón 5 L natural",
        }),
      ]}
      total={2}
      params={params}
      categories={[CAT]}
      openNew={openNew}
    />
  );
}

test("abre el formulario cuando llega ?nuevo=1 estando ya en la página", async () => {
  const { rerender } = render(renderTable(false));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  rerender(renderTable(true));
  expect(await screen.findByRole("dialog")).toBeInTheDocument();
});

test("al cerrar, quita ?nuevo=1 sin perder la búsqueda ni los filtros", async () => {
  render(renderTable(true));
  await screen.findByRole("dialog");
  await userEvent.keyboard("{Escape}");
  expect(replace).toHaveBeenCalledWith("/app/productos?q=balde", { scroll: false });
});

test("cada producto enlaza a su ficha", () => {
  render(renderTable(false));
  const links = screen.getAllByRole("link", { name: /Bidón 5 L azul/ });
  expect(links.length).toBeGreaterThan(0);
  for (const link of links) {
    expect(link).toHaveAttribute("href", "/app/productos/00000000-0000-4000-8000-000000000001");
  }
});

test("las materias primas enlazan a su ficha y usan sus propios textos", () => {
  render(renderTable(false, "raw_material"));
  const links = screen.getAllByRole("link", { name: /Bidón 5 L azul/ });
  expect(links.length).toBeGreaterThan(0);
  for (const link of links) {
    expect(link).toHaveAttribute(
      "href",
      "/app/materias-primas/00000000-0000-4000-8000-000000000001",
    );
  }
  expect(screen.getByRole("button", { name: /Nueva materia prima/ })).toBeVisible();
  expect(screen.getByRole("columnheader", { name: /Costo promedio/ })).toBeVisible();
  expect(screen.queryByRole("columnheader", { name: /Precio de venta/ })).toBeNull();
});

test("los productos muestran costo estándar y precio de venta", () => {
  render(renderTable(false));
  expect(screen.getByRole("columnheader", { name: /Costo estándar/ })).toBeVisible();
  expect(screen.getByRole("columnheader", { name: /Precio de venta/ })).toBeVisible();
  expect(screen.getByRole("button", { name: /Nuevo producto/ })).toBeVisible();
});
