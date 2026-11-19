import { productSchema } from "@/features/products/schemas";

const valid = {
  name: "Bidón 5 L azul",
  sku: "BID-5L-AZ",
  description: "",
  categoryId: null,
  unitCode: "u",
  minStock: 500,
  salePrice: 2850,
  manualCost: null,
  status: "active",
};

test("acepta un producto completo", () => {
  expect(productSchema.safeParse(valid).success).toBe(true);
});

test("normaliza el SKU a mayúsculas y sin espacios en los extremos", () => {
  const result = productSchema.parse({ ...valid, sku: " bd-5l " });
  expect(result.sku).toBe("BD-5L");
});

test("rechaza un SKU con espacios internos", () => {
  const result = productSchema.safeParse({ ...valid, sku: "BD 5L" });
  expect(result.success).toBe(false);
  expect(result.error?.issues[0]?.message).toBe("Usá letras, números y guiones");
});

test("rechaza un stock mínimo negativo", () => {
  expect(productSchema.safeParse({ ...valid, minStock: -1 }).success).toBe(false);
});

test("rechaza un nombre de un solo carácter", () => {
  const result = productSchema.safeParse({ ...valid, name: "A" });
  expect(result.error?.issues[0]?.message).toBe("Ingresá un nombre de al menos 2 caracteres");
});

test("rechaza una unidad que no existe", () => {
  expect(productSchema.safeParse({ ...valid, unitCode: "docena" }).success).toBe(false);
});
