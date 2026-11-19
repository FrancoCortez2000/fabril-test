// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { NumberInput } from "@/components/forms/number-input";

function Harness({
  onChange,
  decimals,
}: {
  onChange: (n: number | null) => void;
  decimals?: number;
}) {
  const [value, setValue] = useState<number | null>(null);
  return (
    <NumberInput
      aria-label="Cantidad"
      value={value}
      decimals={decimals}
      onChange={(n) => {
        setValue(n);
        onChange(n);
      }}
    />
  );
}

test("acepta coma decimal y muestra el valor formateado al salir del campo", async () => {
  const onChange = vi.fn();
  render(<Harness onChange={onChange} />);
  const input = screen.getByLabelText("Cantidad");

  await userEvent.type(input, "0,250");
  await userEvent.tab();

  expect(onChange).toHaveBeenLastCalledWith(0.25);
  expect(input).toHaveValue("0,25");
});

test("informa el valor mientras se escribe, sin esperar a salir del campo", async () => {
  const onChange = vi.fn();
  render(<Harness onChange={onChange} />);

  await userEvent.type(screen.getByLabelText("Cantidad"), "-5");

  expect(onChange).toHaveBeenLastCalledWith(-5);
});

test("con decimales fijos completa los ceros", async () => {
  render(<Harness onChange={() => {}} decimals={3} />);
  const input = screen.getByLabelText("Cantidad");

  await userEvent.type(input, "0,25");
  await userEvent.tab();

  expect(input).toHaveValue("0,250");
});

test("redondea el valor a los decimales configurados", async () => {
  const onChange = vi.fn();
  render(<Harness onChange={onChange} decimals={2} />);

  await userEvent.type(screen.getByLabelText("Cantidad"), "10,555");

  expect(onChange).toHaveBeenLastCalledWith(10.56);
});

test("un texto que no es número se informa como NaN (distinto de vacío) y queda inválido", async () => {
  const onChange = vi.fn();
  render(<Harness onChange={onChange} />);
  const input = screen.getByLabelText("Cantidad");

  await userEvent.type(input, "abc");
  await userEvent.tab();

  expect(onChange).toHaveBeenLastCalledWith(Number.NaN);
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveValue("abc");
});

test("vaciar el campo informa null", async () => {
  const onChange = vi.fn();
  render(<Harness onChange={onChange} />);
  const input = screen.getByLabelText("Cantidad");

  await userEvent.type(input, "12");
  await userEvent.clear(input);

  expect(onChange).toHaveBeenLastCalledWith(null);
});
