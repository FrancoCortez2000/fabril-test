// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";

import { TableCard, TableCardEmpty } from "@/components/data/table-card";

test("es una región con el título como encabezado, el contenido y las acciones", () => {
  render(
    <TableCard title="Movimientos" meta="Últimos 50" actions={<button>Ver todos</button>}>
      <table>
        <tbody>
          <tr>
            <td>fila</td>
          </tr>
        </tbody>
      </table>
    </TableCard>,
  );
  const region = screen.getByRole("region", { name: "Movimientos" });
  expect(within(region).getByRole("heading", { name: "Movimientos" })).toBeVisible();
  expect(within(region).getByText("Últimos 50")).toBeVisible();
  expect(within(region).getByRole("button", { name: "Ver todos" })).toBeVisible();
  expect(within(region).getByText("fila")).toBeVisible();
});

test("la descripción va debajo del título", () => {
  render(
    <TableCard title="Receta" description="Rinde 1 u.">
      <p>contenido</p>
    </TableCard>,
  );
  expect(
    within(screen.getByRole("region", { name: "Receta" })).getByText("Rinde 1 u."),
  ).toBeVisible();
});

test("el estado vacío se muestra dentro de la tarjeta", () => {
  render(
    <TableCard title="Compras recientes">
      <TableCardEmpty>Todavía no se compró.</TableCardEmpty>
    </TableCard>,
  );
  expect(
    within(screen.getByRole("region", { name: "Compras recientes" })).getByText(
      "Todavía no se compró.",
    ),
  ).toBeVisible();
});

test("dos tarjetas con el mismo título no comparten el id del encabezado", () => {
  render(
    <>
      <TableCard title="A">
        <p>1</p>
      </TableCard>
      <TableCard title="A">
        <p>2</p>
      </TableCard>
    </>,
  );
  const [first, second] = screen.getAllByRole("region", { name: "A" });
  expect(first!.getAttribute("aria-labelledby")).not.toBe(second!.getAttribute("aria-labelledby"));
});
