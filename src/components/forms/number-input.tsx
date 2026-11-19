"use client";

import { useState } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { formatNumber, parseDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";

type NativeInputProps = Omit<
  React.ComponentProps<"input">,
  "value" | "defaultValue" | "onChange" | "type" | "inputMode"
>;

export type NumberInputProps = NativeInputProps & {
  value: number | null;
  onChange: (value: number | null) => void;
  /** Decimales fijos al mostrar (p. ej. 2 para dinero, 3 para kg). */
  decimals?: number;
  /** Unidad que se muestra a la derecha (kg, u, %…). */
  unit?: string;
  /** Texto fijo a la izquierda (p. ej. `$`). */
  prefix?: string;
};

function display(value: number | null, decimals?: number): string {
  if (value === null || Number.isNaN(value)) return "";
  return formatNumber(value, decimals === undefined ? {} : { decimals });
}

function roundTo(value: number, decimals?: number): number {
  if (decimals === undefined) return value;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Campo numérico con formato argentino: acepta `0,250` o `1.234,5`.
 *
 * Contrato de `onChange` (se llama en cada tecla, no sólo al salir del campo):
 * - número válido → el número, redondeado a `decimals` si se indicó;
 * - campo vacío → `null`;
 * - texto que no es un número → `NaN`, para que la validación (Zod) lo rechace
 *   en lugar de confundirlo con un campo vacío.
 * Al salir del campo, un valor válido se muestra formateado.
 */
export function NumberInput({
  value,
  onChange,
  decimals,
  unit,
  prefix,
  className,
  onFocus,
  onBlur,
  "aria-invalid": ariaInvalid,
  ...props
}: NumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  const text = draft ?? display(value, decimals);

  function interpret(raw: string): number | null {
    if (raw.trim() === "") return null;
    const parsed = parseDecimal(raw);
    return parsed === null ? Number.NaN : roundTo(parsed, decimals);
  }

  function handleChange(raw: string) {
    setDraft(raw);
    const next = interpret(raw);
    if (next === null || !Number.isNaN(next)) setInvalid(false);
    onChange(next);
  }

  function commit(raw: string) {
    const next = interpret(raw);
    const isInvalid = next !== null && Number.isNaN(next);
    setInvalid(isInvalid);
    // Un valor válido se vuelve a mostrar formateado; uno inválido queda como se escribió.
    setDraft(isInvalid ? raw : null);
  }

  return (
    <InputGroup className={cn(className)} data-disabled={props.disabled ? "true" : undefined}>
      {prefix ? (
        <InputGroupAddon>
          <InputGroupText>{prefix}</InputGroupText>
        </InputGroupAddon>
      ) : null}
      <InputGroupInput
        {...props}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className="tabular"
        value={text}
        aria-invalid={invalid || ariaInvalid === true || ariaInvalid === "true" ? true : undefined}
        onFocus={(e) => {
          setDraft(text);
          onFocus?.(e);
        }}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={(e) => {
          commit(e.target.value);
          onBlur?.(e);
        }}
      />
      {unit ? (
        <InputGroupAddon align="inline-end">
          <InputGroupText>{unit}</InputGroupText>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}

/** Importe en pesos: prefijo `$` y dos decimales. */
export function MoneyInput(props: Omit<NumberInputProps, "decimals" | "prefix">) {
  return <NumberInput {...props} prefix="$" decimals={2} />;
}
