import { readFileSync } from "node:fs";
import { join } from "node:path";

// Ícono de la pestaña: la marca de FABRIL (no el de Next.js que viene por defecto).
const APP = join(process.cwd(), "src/app");
const ROOF = "M1 23V13l8-6v6l8-6v6l8-6v16H1Z"; // el mismo techo en diente de sierra de LogoMark

describe("ícono de la pestaña", () => {
  test("el SVG es la marca: techo en diente de sierra, con el último diente amarillo", () => {
    const svg = readFileSync(join(APP, "icon.svg"), "utf8");
    expect(svg).toContain(ROOF);
    expect(svg.toLowerCase()).toContain("#f2a900");
  });

  test("favicon.ico trae la marca en 16, 32 y 48 px (para los navegadores sin SVG)", () => {
    const ico = readFileSync(join(APP, "favicon.ico"));
    expect(ico.readUInt16LE(0)).toBe(0); // reservado
    expect(ico.readUInt16LE(2)).toBe(1); // tipo: ícono
    const count = ico.readUInt16LE(4);
    const sizes = Array.from({ length: count }, (_, i) => ico[6 + i * 16] || 256);
    expect(sizes).toEqual([16, 32, 48]);
    // ya no es el de Next.js: cada imagen es un PNG generado desde icon.svg
    for (let i = 0; i < count; i++) {
      const offset = ico.readUInt32LE(6 + i * 16 + 12);
      expect(ico.subarray(offset + 1, offset + 4).toString("ascii")).toBe("PNG");
    }
  });
});
