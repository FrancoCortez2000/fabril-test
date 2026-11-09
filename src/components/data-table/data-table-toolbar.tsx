"use client";

import { Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { DataTableFilter, type FilterDef } from "@/components/data-table/data-table-filter";
import type { TableParams } from "@/components/data-table/params";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

const SEARCH_DEBOUNCE_MS = 300;

export function DataTableToolbar({
  params,
  filters = [],
  searchPlaceholder = "Buscar",
  pending,
  onChange,
  children,
}: {
  params: TableParams;
  filters?: FilterDef[];
  searchPlaceholder?: string;
  pending: boolean;
  onChange: (patch: Partial<TableParams>) => void;
  /** Acciones extra alineadas a la derecha. */
  children?: React.ReactNode;
}) {
  const [query, setQuery] = useState(params.q);
  const lastSent = useRef(params.q);

  // Si la URL cambia desde afuera (p. ej. "Limpiar"), reflejarlo en el campo.
  useEffect(() => {
    if (params.q !== lastSent.current) {
      lastSent.current = params.q;
      setQuery(params.q);
    }
  }, [params.q]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === lastSent.current) return;
    const timer = setTimeout(() => {
      lastSent.current = trimmed;
      onChange({ q: trimmed });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, onChange]);

  const hasFilters = Object.keys(params.filters).length > 0 || params.q !== "";

  return (
    <div className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:w-72">
          <InputGroupAddon>
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : <Search aria-hidden />}
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label="Borrar búsqueda"
                onClick={() => setQuery("")}
              >
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
        {filters.map((f) => (
          <DataTableFilter
            key={f.id}
            filter={f}
            selected={params.filters[f.id] ?? []}
            onChange={(values) => {
              const next = { ...params.filters };
              if (values.length) next[f.id] = values;
              else delete next[f.id];
              onChange({ filters: next });
            }}
          />
        ))}
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              lastSent.current = "";
              onChange({ q: "", filters: {} });
            }}
          >
            Limpiar
            <X aria-hidden />
          </Button>
        ) : null}
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  );
}
