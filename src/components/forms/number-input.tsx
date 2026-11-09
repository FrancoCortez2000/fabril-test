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
  if (value === null) return "";
  return formatNumber(value, decimals === undefined ? {} : { decimals });
}

/**
 * Campo numérico con formato argentino: acepta `0,250` o `1.234,5`
 * y al salir del campo muestra el valor formateado.
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

  const text = draft ?? (invalid ? "" : display(value, decimals));

  function commit(raw: string) {
    const parsed = parseDecimal(raw);
    const isInvalid = raw.trim() !== "" && parsed === null;
    setInvalid(isInvalid);
    onChange(parsed);
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
        onChange={(e) => setDraft(e.target.value)}
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
