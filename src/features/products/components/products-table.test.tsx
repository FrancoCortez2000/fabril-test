// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { TableParams } from "@/components/data-table/params";
import { ProductsTable } from "@/features/products/components/products-table";
import { FIXTURE_CATEGORIES, FIXTURE_PRODUCTS } from "@/fixtures/products";

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

const params: TableParams = { page: 1, pageSize: 25, sort: null, q: "balde", filters: {} };
const rows = FIXTURE_PRODUCTS.slice(0, 2);

function renderTable(openNew: boolean) {
  return (
    <ProductsTable
      rows={rows}
      total={2}
      params={params}
      categories={FIXTURE_CATEGORIES}
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
