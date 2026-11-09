"use client";

import { Check, PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string };
export type FilterDef = { id: string; label: string; options: FilterOption[] };

export function DataTableFilter({
  filter,
  selected,
  onChange,
}: {
  filter: FilterDef;
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const selectedSet = new Set(selected);

  function toggle(value: string) {
    const next = new Set(selectedSet);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(filter.options.map((o) => o.value).filter((v) => next.has(v)));
  }

  const selectedLabels = filter.options.filter((o) => selectedSet.has(o.value));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="border-dashed">
          <PlusCircle aria-hidden />
          {filter.label}
          {selectedLabels.length ? (
            <>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <span className="rounded-sm bg-surface-2 px-1.5 text-xs font-medium">
                {selectedLabels.length > 2
                  ? `${selectedLabels.length} seleccionados`
                  : selectedLabels.map((o) => o.label).join(", ")}
              </span>
            </>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <Command>
          {filter.options.length > 6 ? (
            <CommandInput placeholder={`Buscar ${filter.label.toLowerCase()}`} />
          ) : null}
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup>
              {filter.options.map((option) => {
                const isSelected = selectedSet.has(option.value);
                return (
                  <CommandItem key={option.value} onSelect={() => toggle(option.value)}>
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded-sm border",
                        isSelected
                          ? "border-foreground bg-foreground text-background"
                          : "border-input",
                      )}
                    >
                      {isSelected ? <Check className="size-3" /> : null}
                    </span>
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selected.length ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => onChange([])} className="justify-center">
                    Quitar filtro
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
