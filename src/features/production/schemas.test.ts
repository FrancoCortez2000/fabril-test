import { orderSchema } from "@/features/production/schemas";

const ITEM = "11111111-1111-4111-8111-111111111111";
const EMP = "22222222-2222-4222-8222-222222222222";

const valid = {
  itemId: ITEM,
  plannedQty: 100,
  plannedStart: "2026-11-24",
  plannedEnd: "2026-11-30",
  priority: "normal",
  responsibleId: EMP,
  notes: "",
};

const messages = (input: unknown) =>
  (orderSchema.safeParse(input).error?.issues ?? []).map((i) => i.message);

describe("orderSchema", () => {
  test("acepta una orden completa", () => {
    expect(orderSchema.safeParse(valid).success).toBe(true);
  });

  test("las fechas y el responsable son opcionales", () => {
    expect(
      orderSchema.safeParse({ ...valid, plannedStart: null, plannedEnd: null, responsibleId: null })
        .success,
    ).toBe(true);
  });

  test("puede venir sólo una de las dos fechas", () => {
    expect(orderSchema.safeParse({ ...valid, plannedStart: null }).success).toBe(true);
    expect(orderSchema.safeParse({ ...valid, plannedEnd: null }).success).toBe(true);
  });

  test.each([
    ["cantidad cero", { plannedQty: 0 }, "La cantidad a fabricar tiene que ser mayor a cero"],
    ["cantidad negativa", { plannedQty: -5 }, "La cantidad a fabricar tiene que ser mayor a cero"],
    ["producto que no es un id", { itemId: "x" }, "Elegí un producto"],
    [
      "fin anterior al inicio",
      { plannedStart: "2026-11-30", plannedEnd: "2026-11-24" },
      "La fecha de fin no puede ser anterior a la de inicio",
    ],
    ["fecha en otro formato", { plannedStart: "24/11/2026" }, "Ingresá una fecha válida"],
    ["prioridad inexistente", { priority: "maxima" }, null],
    ["responsable que no es un id", { responsibleId: "x" }, null],
    ["notas larguísimas", { notes: "x".repeat(501) }, "Máximo 500 caracteres"],
  ])("rechaza %s", (_name, override, message) => {
    const input = { ...valid, ...override };
    expect(orderSchema.safeParse(input).success).toBe(false);
    if (message) expect(messages(input)).toContain(message);
  });

  test("un inicio y un fin iguales son válidos (orden de un día)", () => {
    expect(
      orderSchema.safeParse({ ...valid, plannedStart: "2026-11-24", plannedEnd: "2026-11-24" })
        .success,
    ).toBe(true);
  });

  test("una cantidad que no es un número se rechaza", () => {
    expect(orderSchema.safeParse({ ...valid, plannedQty: Number.NaN }).success).toBe(false);
    expect(orderSchema.safeParse({ ...valid, plannedQty: null }).success).toBe(false);
  });
});
