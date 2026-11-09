/**
 * Estado de las tablas en la URL: página, tamaño, orden, búsqueda y filtros.
 * Se valida siempre: la URL la puede escribir cualquiera.
 */

export const PAGE_SIZES = [10, 25, 50] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
const DEFAULT_PAGE_SIZE: PageSize = 25;

export type TableSort = { id: string; desc: boolean };

export type TableParams = {
  page: number;
  pageSize: PageSize;
  sort: TableSort | null;
  q: string;
  filters: Record<string, string[]>;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

const RESERVED = new Set(["page", "pageSize", "sort", "q"]);

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseSort(raw: string | undefined, sortable: string[]): TableSort | null {
  if (!raw) return null;
  const [id, dir] = raw.split(".");
  if (!id || !sortable.includes(id) || (dir !== "asc" && dir !== "desc")) return null;
  return { id, desc: dir === "desc" };
}

export function parseTableParams(
  sp: RawSearchParams,
  opts: { sortable: string[]; filterable: string[]; defaultSort?: TableSort | null },
): TableParams {
  const pageNum = Number.parseInt(first(sp.page) ?? "", 10);
  const sizeNum = Number(first(sp.pageSize));

  const filters: Record<string, string[]> = {};
  for (const key of opts.filterable) {
    const raw = sp[key];
    if (raw === undefined) continue;
    const values = (Array.isArray(raw) ? raw : raw.split(",")).map((v) => v.trim()).filter(Boolean);
    if (values.length) filters[key] = [...new Set(values)];
  }

  return {
    page: Number.isFinite(pageNum) && pageNum >= 1 ? pageNum : 1,
    pageSize: (PAGE_SIZES as readonly number[]).includes(sizeNum)
      ? (sizeNum as PageSize)
      : DEFAULT_PAGE_SIZE,
    sort: parseSort(first(sp.sort), opts.sortable) ?? opts.defaultSort ?? null,
    q: (first(sp.q) ?? "").trim().slice(0, 100),
    filters,
  };
}

/** Serializa omitiendo los valores por defecto para que la URL quede limpia. */
export function serializeTableParams(p: Partial<TableParams>): URLSearchParams {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.sort) sp.set("sort", `${p.sort.id}.${p.sort.desc ? "desc" : "asc"}`);
  for (const [key, values] of Object.entries(p.filters ?? {})) {
    if (!RESERVED.has(key) && values.length) sp.set(key, values.join(","));
  }
  if (p.page && p.page > 1) sp.set("page", String(p.page));
  if (p.pageSize && p.pageSize !== DEFAULT_PAGE_SIZE) sp.set("pageSize", String(p.pageSize));
  return sp;
}

/** Sólo para datos de ejemplo: en la Etapa 4 la paginación la resuelve la consulta. */
export function paginate<T>(rows: T[], p: TableParams): { rows: T[]; total: number } {
  const start = (p.page - 1) * p.pageSize;
  return { rows: rows.slice(start, start + p.pageSize), total: rows.length };
}
