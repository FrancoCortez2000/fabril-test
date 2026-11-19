"use client";

import { useId } from "react";
import {
  Controller,
  type Control,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

export type FormFieldControlProps = {
  id: string;
  "aria-invalid": boolean | undefined;
  "aria-describedby": string | undefined;
};

/**
 * Campo de formulario conectado a React Hook Form: etiqueta, control, ayuda y error.
 * `render` recibe el `field` de RHF y las props de accesibilidad para el control.
 */
export function FormField<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  control,
  name,
  label,
  description,
  optional,
  render,
  className,
}: {
  control: Control<TValues>;
  name: TName;
  label: string;
  description?: React.ReactNode;
  optional?: boolean;
  render: (
    field: ControllerRenderProps<TValues, TName>,
    controlProps: FormFieldControlProps,
  ) => React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const invalid = fieldState.invalid;
        const describedBy =
          [description ? descriptionId : null, invalid ? errorId : null]
            .filter(Boolean)
            .join(" ") || undefined;

        return (
          <Field data-invalid={invalid || undefined} className={className}>
            <FieldLabel htmlFor={id}>
              {label}
              {optional ? (
                <span className="font-normal text-muted-foreground">(opcional)</span>
              ) : null}
            </FieldLabel>
            {render(field, {
              id,
              "aria-invalid": invalid || undefined,
              "aria-describedby": describedBy,
            })}
            {description ? (
              <FieldDescription id={descriptionId}>{description}</FieldDescription>
            ) : null}
            {invalid ? <FieldError id={errorId} errors={[fieldState.error]} /> : null}
          </Field>
        );
      }}
    />
  );
}
