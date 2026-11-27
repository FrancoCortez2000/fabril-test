import Image, { alt, contentType, size } from "@/app/(marketing)/opengraph-image";

// La imagen que muestran WhatsApp, LinkedIn y demás al compartir el link.
describe("imagen para compartir el link", () => {
  test("es un PNG de 1200×630, el tamaño que esperan las redes", async () => {
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe("image/png");

    const response = await Image();
    expect(response.headers.get("content-type")).toBe("image/png");
    const png = Buffer.from(await response.arrayBuffer());
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1200); // ancho en la cabecera IHDR
    expect(png.readUInt32BE(20)).toBe(630); // alto
  }, 30_000);

  test("tiene texto alternativo con la marca y la propuesta", () => {
    expect(alt).toMatch(/FABRIL/);
    expect(alt).toMatch(/Sabé qué fabricar/);
  });
});
