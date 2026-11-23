import {
  cancelPurchaseSchema,
  confirmPurchaseSchema,
  receivePurchaseSchema,
  todayInBuenosAires,
} from "@/features/purchasing/schemas";

const PO = "11111111-1111-4111-8111-111111111111";
const LINE = "22222222-2222-4222-8222-222222222222";
const LINE2 = "33333333-3333-4333-8333-333333333333";

const receive = {
  id: PO,
  deliveryNote: "0001-00004567",
  receivedAt: "2026-10-01",
  lines: [{ lineId: LINE, quantity: 10 }],
};

describe("todayInBuenosAires", () => {
  test("devuelve una fecha YYYY-MM-DD", () => {
    expect(todayInBuenosAires()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("confirmPurchaseSchema", () => {
  test("exige un id válido", () => {
    expect(confirmPurchaseSchema.safeParse({ id: PO }).success).toBe(true);
    expect(confirmPurchaseSchema.safeParse({ id: "x" }).success).toBe(false);
  });
});

describe("cancelPurchaseSchema", () => {
  test("pide un motivo de 3 a 200 caracteres", () => {
    expect(cancelPurchaseSchema.safeParse({ id: PO, reason: "Cambio de proveedor" }).success).toBe(
      true,
    );
    for (const reason of ["", "   ", "ab", "x".repeat(201)]) {
      expect(cancelPurchaseSchema.safeParse({ id: PO, reason }).success).toBe(false);
    }
  });

  test("el motivo vacío explica qué falta", () => {
    const issues = cancelPurchaseSchema.safeParse({ id: PO, reason: "" }).error?.issues ?? [];
    expect(issues.map((i) => i.message)).toContain("Indicá el motivo de la cancelación");
  });
});

describe("receivePurchaseSchema", () => {
  test("acepta una recepción con remito y una línea", () => {
    expect(receivePurchaseSchema.safeParse(receive).success).toBe(true);
  });

  test("el remito es opcional", () => {
    expect(receivePurchaseSchema.safeParse({ ...receive, deliveryNote: "" }).success).toBe(true);
  });

  test.each([
    ["cantidad cero", { lines: [{ lineId: LINE, quantity: 0 }] }],
    ["cantidad negativa", { lines: [{ lineId: LINE, quantity: -1 }] }],
    ["sin líneas", { lines: [] }],
    ["línea que no es un id", { lines: [{ lineId: "x", quantity: 1 }] }],
    [
      "línea repetida",
      {
        lines: [
          { lineId: LINE, quantity: 1 },
          { lineId: LINE, quantity: 2 },
        ],
      },
    ],
    ["fecha en otro formato", { receivedAt: "01/10/2026" }],
    ["fecha futura", { receivedAt: "2999-01-01" }],
    ["remito larguísimo", { deliveryNote: "x".repeat(41) }],
  ])("rechaza %s", (_name, override) => {
    expect(receivePurchaseSchema.safeParse({ ...receive, ...override }).success).toBe(false);
  });

  test("acepta varias líneas distintas", () => {
    expect(
      receivePurchaseSchema.safeParse({
        ...receive,
        lines: [
          { lineId: LINE, quantity: 1 },
          { lineId: LINE2, quantity: 2 },
        ],
      }).success,
    ).toBe(true);
  });
});
