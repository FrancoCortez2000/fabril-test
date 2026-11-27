import { metadataBase } from "@/lib/metadata-base";

// Base de las URLs absolutas de los metadatos (la imagen al compartir el link necesita una URL completa).
describe("metadataBase", () => {
  test("en Vercel usa el dominio de producción, con https", () => {
    const base = metadataBase({
      VERCEL_PROJECT_PRODUCTION_URL: "fabril-test.vercel.app",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    });
    expect(base.toString()).toBe("https://fabril-test.vercel.app/");
  });

  test("fuera de Vercel usa NEXT_PUBLIC_SITE_URL", () => {
    expect(metadataBase({ NEXT_PUBLIC_SITE_URL: "http://localhost:3100" }).toString()).toBe(
      "http://localhost:3100/",
    );
  });

  test("sin ninguna de las dos, cae en localhost en vez de romper el build", () => {
    expect(metadataBase({ VERCEL_PROJECT_PRODUCTION_URL: "  " }).toString()).toBe(
      "http://localhost:3000/",
    );
  });
});
