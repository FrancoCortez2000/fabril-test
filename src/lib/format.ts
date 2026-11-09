import { formatDistanceStrict } from "date-fns";
import { es } from "date-fns/locale";

export const TIMEZONE = "America/Argentina/Buenos_Aires";
const LOCALE = "es-AR";

const currencyFormatter = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "ARS" });

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

/** `$ 1.234,56` — el signo negativo siempre adelante (`-$ 50,00`). */
export function formatCurrency(value: number): string {
  const formatted = currencyFormatter.format(Math.abs(value));
  return value < 0 ? `-${formatted}` : formatted;
}

/** `1.234,5`. Con `decimals` fija la cantidad de decimales; sin él muestra hasta 3. */
export function formatNumber(value: number, opts: { decimals?: number } = {}): string {
  const { decimals } = opts;
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? 3,
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

/** `hace 5 minutos`. */
export function formatRelative(value: string | Date, now: Date = new Date()): string {
  return formatDistanceStrict(toDate(value), now, { addSuffix: true, locale: es });
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
