import { csvResponse, toCsv } from "@/lib/csv";

const BOM = "﻿";

describe("toCsv", () => {
  test("empieza con BOM UTF-8 (Excel abre bien las tildes), encabezado y una línea por fila", () => {
    const csv = toCsv(
      ["Nombre", "Cantidad"],
      [
        ["Polipropileno", 10],
        ["Ñandú", 2.5],
      ],
    );
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv.slice(1)).toBe("Nombre,Cantidad\r\nPolipropileno,10\r\nÑandú,2.5\r\n");
  });

  test("comas, comillas y saltos de línea se escapan entre comillas", () => {
    const csv = toCsv(["a"], [['Balde "grande", rojo'], ["línea 1\nlínea 2"]]);
    expect(csv).toContain('"Balde ""grande"", rojo"');
    expect(csv).toContain('"línea 1\nlínea 2"');
  });

  test("null y undefined quedan vacíos; 0 se conserva", () => {
    expect(toCsv(["a", "b", "c"], [[null, undefined as unknown as null, 0]]).slice(1)).toBe(
      "a,b,c\r\n,,0\r\n",
    );
  });

  test("un texto que empieza con = + - @ tab o CR no se interpreta como fórmula", () => {
    for (const bad of ["=SUMA(1;1)", "+54 11", "-cmd", "@usuario", "\tx", "\rx"]) {
      const cell = toCsv(["a"], [[bad]])
        .slice(1)
        .split("\r\n")[1]!;
      expect(cell.replace(/^"/, "").startsWith("'")).toBe(true);
    }
  });

  test("un número negativo no se confunde con texto: no se prefija", () => {
    expect(toCsv(["a"], [[-5]]).slice(1)).toBe("a\r\n-5\r\n");
  });

  test("el encabezado también se protege", () => {
    expect(toCsv(["=HYPERLINK()"], []).slice(1)).toBe("'=HYPERLINK()\r\n");
  });

  test("una fila con otra cantidad de columnas es un error", () => {
    expect(() => toCsv(["a", "b"], [["solo uno"]])).toThrow(/columnas/);
  });

  test("sin filas devuelve sólo el encabezado", () => {
    expect(toCsv(["a", "b"], []).slice(1)).toBe("a,b\r\n");
  });
});

describe("csvResponse", () => {
  test("responde text/csv como adjunto con el nombre pedido", async () => {
    const res = csvResponse("inventario-2026-11-23.csv", ["a"], [["x"]]);
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="inventario-2026-11-23.csv"',
    );
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    // `Response.text()` descarta el BOM al decodificar: se comprueban los bytes crudos.
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes)).toBe(`${BOM}a\r\nx\r\n`);
  });
});
