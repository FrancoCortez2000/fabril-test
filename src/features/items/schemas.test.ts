import { itemSchema, saveItemSchema, toItemPayload } from "@/features/items/schemas";
import { marginPct } from "@/features/items/calc";

const product = {
  kind: "finished_good",
  name: "Bidón 5 L azul",
  sku: "BID-5L-AZ",
  description: "",
  categoryId: null,
  unitCode: "u",
  minStock: 500,
  status: "active",
  salePrice: 2850,
  standardLaborMinutes: 15,
  overheadPerUnit: 20,
  preferredSupplierId: null,
};

const rawMaterial = {
  ...product,
  kind: "raw_material",
  name: "PEAD",
  sku: "PEAD",
  unitCode: "kg",
  salePrice: null,
  standardLaborMinutes: 0,
  overheadPerUnit: 0,
};

describe("itemSchema", () => {
  test("acepta un producto y una materia prima completos", () => {
    expect(itemSchema.safeParse(product).success).toBe(true);
    expect(itemSchema.safeParse(rawMaterial).success).toBe(true);
  });

  test("no tiene campo de costo manual: lo que llegue se descarta", () => {
    const parsed = itemSchema.parse({ ...product, manualCost: 99999 });
    expect("manualCost" in parsed).toBe(false);
  });

  test("normaliza el SKU a mayúsculas y sin espacios en los extremos", () => {
    expect(itemSchema.parse({ ...product, sku: " bd-5l " }).sku).toBe("BD-5L");
  });

  test("rechaza un SKU con espacios internos", () => {
    const result = itemSchema.safeParse({ ...product, sku: "BD 5L" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Usá letras, números y guiones");
  });

  test("rechaza un nombre de un solo carácter", () => {
    const result = itemSchema.safeParse({ ...product, name: "A" });
    expect(result.error?.issues[0]?.message).toBe("Ingresá un nombre de al menos 2 caracteres");
  });

  test.each([
    ["stock mínimo negativo", { minStock: -1 }],
    ["minutos estándar negativos", { standardLaborMinutes: -5 }],
    ["indirectos negativos", { overheadPerUnit: -1 }],
    ["precio negativo", { salePrice: -10 }],
    ["unidad inexistente", { unitCode: "docena" }],
    ["tipo inexistente", { kind: "servicio" }],
    ["categoría que no es un id", { categoryId: "abc" }],
    ["proveedor que no es un id", { preferredSupplierId: "abc" }],
  ])("rechaza %s", (_name, override) => {
    expect(itemSchema.safeParse({ ...product, ...override }).success).toBe(false);
  });
});

describe("saveItemSchema", () => {
  test("el id es opcional pero tiene que ser un UUID", () => {
    expect(saveItemSchema.safeParse(product).success).toBe(true);
    expect(
      saveItemSchema.safeParse({ ...product, id: "11111111-1111-4111-8111-111111111111" }).success,
    ).toBe(true);
    expect(saveItemSchema.safeParse({ ...product, id: "uno" }).success).toBe(false);
  });
});

describe("toItemPayload", () => {
  test("una materia prima descarta precio, minutos e indirectos aunque lleguen", () => {
    const payload = toItemPayload(
      itemSchema.parse({
        ...rawMaterial,
        salePrice: 999,
        standardLaborMinutes: 30,
        overheadPerUnit: 7,
      }),
    );
    expect(payload).toMatchObject({
      sale_price: null,
      standard_labor_minutes: 0,
      overhead_per_unit: 0,
    });
  });

  test("un producto descarta el proveedor preferido", () => {
    const payload = toItemPayload(
      itemSchema.parse({
        ...product,
        preferredSupplierId: "22222222-2222-4222-8222-222222222222",
      }),
    );
    expect(payload.preferred_supplier_id).toBeNull();
    expect(payload).toMatchObject({
      sale_price: 2850,
      standard_labor_minutes: 15,
      overhead_per_unit: 20,
    });
  });

  test("la descripción vacía se guarda como nula y no se envía unit_id, type ni organización", () => {
    const payload = toItemPayload(itemSchema.parse(product));
    expect(payload.description).toBeNull();
    expect(Object.keys(payload)).not.toEqual(
      expect.arrayContaining(["unit_id", "type", "organization_id", "manual_cost"]),
    );
  });
});

describe("marginPct", () => {
  test("(precio - costo estándar) / precio", () => {
    expect(marginPct(2850, 1778)).toBeCloseTo(37.61, 2);
  });

  test("es nulo si falta el precio, el costo o el precio es cero", () => {
    expect(marginPct(null, 1778)).toBeNull();
    expect(marginPct(2850, null)).toBeNull();
    expect(marginPct(0, 100)).toBeNull();
  });

  test("puede ser negativo si se vende por debajo del costo", () => {
    expect(marginPct(1000, 1500)).toBe(-50);
  });
});
