import { generalSettingsSchema } from "@/features/settings/schemas";

const valid = {
  name: "Plásticos Sur S.R.L.",
  legalName: "Plásticos Sur Sociedad de Responsabilidad Limitada",
  cuit: "30-71234567-9",
  address: "Av. Industrial 1234",
  city: "Rosario",
  province: "Santa Fe",
  phone: "+54 341 555 0101",
  email: "contacto@plasticossur.com",
  timezone: "America/Argentina/Buenos_Aires",
  defaultWastePct: 3,
  defaultLaborRate: 6000,
  allowNegativeStock: false,
};

const messages = (input: unknown) =>
  (generalSettingsSchema.safeParse(input).error?.issues ?? []).map((i) => i.message);

describe("generalSettingsSchema", () => {
  test("acepta los datos completos", () => {
    expect(generalSettingsSchema.safeParse(valid).success).toBe(true);
  });

  test("los datos opcionales pueden quedar vacíos", () => {
    const result = generalSettingsSchema.safeParse({
      ...valid,
      legalName: "",
      cuit: "",
      address: "",
      city: "",
      province: "",
      phone: "",
      email: "",
    });
    expect(result.success).toBe(true);
  });

  test("recorta espacios del nombre", () => {
    expect(generalSettingsSchema.parse({ ...valid, name: "  Mi fábrica  " }).name).toBe(
      "Mi fábrica",
    );
  });

  test.each([
    ["nombre de un carácter", { name: "A" }, "Ingresá un nombre de al menos 2 caracteres"],
    [
      "CUIT sin guiones",
      { cuit: "30712345679" },
      "El CUIT tiene que tener el formato 30-12345678-9",
    ],
    [
      "CUIT con letras",
      { cuit: "30-1234567a-9" },
      "El CUIT tiene que tener el formato 30-12345678-9",
    ],
    ["email inválido", { email: "no-es-un-email" }, "Ingresá un email válido"],
    ["zona horaria vacía", { timezone: "" }, "Elegí una zona horaria"],
    ["desperdicio mayor a 100", { defaultWastePct: 101 }, "El desperdicio no puede superar 100 %"],
    ["desperdicio negativo", { defaultWastePct: -1 }, "El desperdicio no puede ser negativo"],
    ["costo hora negativo", { defaultLaborRate: -5 }, "El costo hora no puede ser negativo"],
  ])("rechaza %s", (_name, override, message) => {
    expect(messages({ ...valid, ...override })).toContain(message);
  });

  test("rechaza campos largos", () => {
    expect(generalSettingsSchema.safeParse({ ...valid, address: "x".repeat(201) }).success).toBe(
      false,
    );
    expect(generalSettingsSchema.safeParse({ ...valid, name: "x".repeat(121) }).success).toBe(
      false,
    );
  });

  test("los números tienen que ser números", () => {
    expect(
      generalSettingsSchema.safeParse({ ...valid, defaultLaborRate: Number.NaN }).success,
    ).toBe(false);
  });
});
