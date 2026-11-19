import { stockLevel } from "@/lib/domain/stock";

test("sin stock cuando no queda nada (o queda negativo)", () => {
  expect(stockLevel(0, 100)).toBe("out");
  expect(stockLevel(-5, 100)).toBe("out");
});

test("stock bajo cuando está por debajo del mínimo", () => {
  expect(stockLevel(99.5, 100)).toBe("low");
});

test("en el mínimo exacto todavía está bien", () => {
  expect(stockLevel(100, 100)).toBe("ok");
});

test("sin mínimo configurado, cualquier cantidad positiva está bien", () => {
  expect(stockLevel(1, 0)).toBe("ok");
});
