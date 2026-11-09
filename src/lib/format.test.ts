import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatQuantity,
  formatRelative,
  parseDecimal,
} from "@/lib/format";

/** Intl usa espacios duros (U+00A0 / U+202F); los normalizamos para comparar. */
const n = (s: string) => s.replace(/[  ]/g, " ");

describe("formatCurrency", () => {
  test("formatea pesos con separador de miles y dos decimales", () => {
    expect(n(formatCurrency(1234567.891))).toBe("$ 1.234.567,89");
  });
  test("pone el signo negativo adelante", () => {
    expect(n(formatCurrency(-50))).toBe("-$ 50,00");
  });
});

describe("formatNumber", () => {
  test("usa punto de miles y coma decimal", () => {
    expect(formatNumber(1234.5)).toBe("1.234,5");
  });
  test("respeta decimales fijos", () => {
    expect(formatNumber(0.25, { decimals: 3 })).toBe("0,250");
  });
});

describe("formatQuantity", () => {
  test("agrega la unidad", () => {
    expect(n(formatQuantity(257.5, "kg"))).toBe("257,5 kg");
    expect(n(formatQuantity(1000, "u"))).toBe("1.000 u");
  });
});

describe("formatPercent", () => {
  test("recibe puntos porcentuales", () => {
    expect(n(formatPercent(3))).toBe("3 %");
  });
});

describe("formatDate", () => {
  test("una fecha sin hora no se corre un día por la zona horaria", () => {
    expect(formatDate("2026-11-09")).toBe("09/11/2026");
  });
  test("un instante UTC se muestra en hora de Buenos Aires", () => {
    expect(formatDate("2026-11-09T02:30:00Z")).toBe("08/11/2026");
  });
});

describe("formatDateTime", () => {
  test("muestra DD/MM/AAAA HH:mm en hora de Buenos Aires", () => {
    expect(n(formatDateTime("2026-11-09T17:35:00Z"))).toBe("09/11/2026 14:35");
  });
});

describe("formatRelative", () => {
  test("describe el tiempo transcurrido en español", () => {
    const now = new Date("2026-11-09T12:00:00Z");
    expect(formatRelative(new Date(now.getTime() - 5 * 60_000), now)).toBe("hace 5 minutos");
  });
});

describe("parseDecimal", () => {
  test.each([
    ["0,250", 0.25],
    ["1.234,5", 1234.5],
    [" 12 ", 12],
    ["12.5", 12.5],
    ["1.234", 1234],
  ])("interpreta %j como %d", (input, expected) => {
    expect(parseDecimal(input)).toBe(expected);
  });

  test.each([["abc"], [""], ["1,2,3"]])("rechaza %j", (input) => {
    expect(parseDecimal(input)).toBeNull();
  });
});
