import { formatDistanceStrict } from "date-fns";
import { es } from "date-fns/locale";

export const TIMEZONE = "America/Argentina/Buenos_Aires";
const LOCALE = "es-AR";

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** `$ 1.234,56` — el signo negativo siempre adelante (`-$ 50,00`). `decimals: 0` para indicadores. */
export function formatCurrency(value: number, opts: { decimals?: number } = {}): string {
  const decimals = opts.decimals ?? 2;
  const formatted = new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));
  return value < 0 && Math.abs(value) >= 0.5 * 10 ** -decimals ? `-${formatted}` : formatted;
}

/** Montos abreviados para ejes y tooltips: `$ 850 mil`, `$ 1,2 M`, `$ 1.500 M`. */
export function formatCompactCurrency(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  let body: string;
  if (abs >= 1_000_000) body = `${formatNumber(abs / 1_000_000, { maxDecimals: 1 })} M`;
  else if (abs >= 1_000) body = `${formatNumber(abs / 1_000, { maxDecimals: 1 })} mil`;
  else body = formatNumber(Math.round(abs));
  return `${sign}$ ${body}`;
}

/** `1.234,5`. `decimals` fija los decimales; `maxDecimals` (por defecto 3) sólo pone un tope. */
export function formatNumber(
  value: number,
  opts: { decimals?: number; maxDecimals?: number } = {},
): string {
  const { decimals, maxDecimals = 3 } = opts;
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? maxDecimals,
  }).format(value);
}

/** `257,5 kg`, `1.000 u`. */
export function formatQuantity(value: number, unitCode: string): string {
  return `${formatNumber(value)} ${unitCode}`;
}

/** Recibe puntos porcentuales: `formatPercent(3)` → `3 %`. */
export function formatPercent(value: number, decimals?: number): string {
  return `${formatNumber(value, decimals === undefined ? {} : { decimals })} %`;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `DD/MM/AAAA`. Las fechas de calendario (`YYYY-MM-DD`) no pasan por zonas horarias. */
export function formatDate(value: string | Date): string {
  if (typeof value === "string") {
    const match = DATE_ONLY.exec(value);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return dateFormatter.format(toDate(value));
}

/** `DD/MM/AAAA HH:mm` en hora de Buenos Aires. */
export function formatDateTime(value: string | Date): string {
  return dateTimeFormatter.format(toDate(value)).replace(",", "");
}

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** Mes `YYYY-MM`: `short` → `nov` (ejes), `long` → `noviembre de 2026` (tooltips). */
export function formatMonth(month: string, style: "short" | "long"): string {
  const [year, m] = month.split("-");
  const name = MONTHS[Number(m) - 1] ?? month;
  return style === "short" ? name.slice(0, 3) : `${name} de ${year}`;
}

/** `hace 5 minutos`. Nunca habla en futuro: lo posterior a `now` o de menos de un minuto es "recién". */
export function formatRelative(value: string | Date, now: Date = new Date()): string {
  const date = toDate(value);
  if (now.getTime() - date.getTime() < 60_000) return "recién";
  return formatDistanceStrict(date, now, { addSuffix: true, locale: es });
}

const COMMA_DECIMAL = /^-?(\d{1,3}(\.\d{3})+|\d+),\d+$/;
const DOT_THOUSANDS = /^-?[1-9]\d{0,2}(\.\d{3})+$/;
const DOT_DECIMAL = /^-?\d+\.\d+$/;
const INTEGER = /^-?\d+$/;

/**
 * Interpreta números tipeados al estilo argentino.
 * - `0,250` → 0.25 · `1.234,5` → 1234.5 · `1.234` → 1234 (punto + grupos de 3 = miles)
 * - `12.5` → 12.5 (punto que no forma grupos de miles se toma como decimal)
 * Devuelve `null` si el texto no es un número válido.
 */
export function parseDecimal(input: string): number | null {
  const s = input.trim();
  if (s === "") return null;
  if (COMMA_DECIMAL.test(s)) return Number(s.replace(/\./g, "").replace(",", "."));
  if (DOT_THOUSANDS.test(s)) return Number(s.replace(/\./g, ""));
  if (DOT_DECIMAL.test(s) || INTEGER.test(s)) return Number(s);
  return null;
}

function toDate(value: string | Date): Date {
  return typeof value === "string" ? new Date(value) : value;
}
