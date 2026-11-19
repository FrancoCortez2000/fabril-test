"use client";

import { es } from "date-fns/locale";
import { CalendarDays, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** `YYYY-MM-DD` → Date local (sin desplazamiento por zona horaria). */
function toLocalDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type DateInputProps = {
  /** Fecha de calendario `YYYY-MM-DD` o `null`. */
  value: string | null;
  onChange: (value: string | null) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  "aria-invalid"?: boolean;
  className?: string;
};

export function DateInput({
  value,
  onChange,
  id,
  placeholder = "DD/MM/AAAA",
  disabled,
  clearable = false,
  className,
  ...aria
}: DateInputProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? toLocalDate(value) : undefined;

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={aria["aria-invalid"] || undefined}
            className={cn(
              "w-full justify-start px-2.5 font-normal shadow-xs",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarDays aria-hidden className="text-muted-foreground" />
            <span className="tabular">{value ? formatDate(value) : placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={es}
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => {
              onChange(date ? toIsoDate(date) : null);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {clearable && value && !disabled ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute top-1/2 right-1.5 -translate-y-1/2"
          aria-label="Quitar fecha"
          onClick={() => onChange(null)}
        >
          <X />
        </Button>
      ) : null}
    </div>
  );
}
