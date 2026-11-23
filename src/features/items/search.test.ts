import { sanitizeSearch } from "@/features/items/search";

describe("sanitizeSearch", () => {
  test("quita los caracteres con significado para PostgREST y colapsa espacios", () => {
    expect(sanitizeSearch("a,b(c)*%\\")).toBe("a b c");
  });

  test("quita comillas y recorta", () => {
    expect(sanitizeSearch("  \"balde\" '10' L  ")).toBe("balde 10 L");
  });

  test("devuelve vacío si sólo quedan símbolos", () => {
    expect(sanitizeSearch(",*()%\\")).toBe("");
    expect(sanitizeSearch("   ")).toBe("");
  });

  test("limita a 100 caracteres", () => {
    expect(sanitizeSearch("a".repeat(150))).toHaveLength(100);
  });

  test("conserva acentos, guiones y puntos", () => {
    expect(sanitizeSearch("Botella PET 1 L - tapa 28.5")).toBe("Botella PET 1 L - tapa 28.5");
    expect(sanitizeSearch("Envase ñandú")).toBe("Envase ñandú");
  });
});
