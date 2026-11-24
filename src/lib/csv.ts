export type CsvCell = string | number | null;

const BOM = "﻿";
/** Un texto que empieza así lo interpreta Excel como fórmula (inyección de fórmulas). */
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: CsvCell | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * Arma un CSV: BOM UTF-8 (Excel abre bien tildes y ñ), coma como separador y saltos `\r\n`. Los
 * textos se escapan y los que parecen fórmulas se neutralizan; los números salen tal cual.
 */
export function toCsv(columns: string[], rows: (CsvCell | undefined)[][]): string {
  for (const row of rows) {
    if (row.length !== columns.length) {
      throw new Error("Una fila no tiene la misma cantidad de columnas que el encabezado");
    }
  }
  const lines = [columns, ...rows].map((row) => row.map(cell).join(","));
  return `${BOM}${lines.join("\r\n")}\r\n`;
}

/** Respuesta HTTP de descarga de un CSV. */
export function csvResponse(
  filename: string,
  columns: string[],
  rows: (CsvCell | undefined)[][],
): Response {
  return new Response(toCsv(columns, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
