import { clientIp } from "@/lib/request-ip";

test("toma la primera IP de x-forwarded-for", () => {
  expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
});

test("si no hay x-forwarded-for usa x-real-ip", () => {
  expect(clientIp(new Headers({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
});

test("sin cabeceras devuelve unknown", () => {
  expect(clientIp(new Headers())).toBe("unknown");
});
