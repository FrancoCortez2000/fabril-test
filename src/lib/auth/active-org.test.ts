import { resolveActiveOrganization } from "@/lib/auth/active-org";

const orgs = [
  { id: "b", name: "Beta" },
  { id: "a", name: "Alfa" },
];

test("usa la cookie si pertenece a una de sus fábricas", () => {
  expect(resolveActiveOrganization(orgs, "b", "a")).toBe("b");
});

test("ignora una cookie de una fábrica ajena y usa la última usada", () => {
  expect(resolveActiveOrganization(orgs, "zzz", "b")).toBe("b");
});

test("sin cookie ni última válida, elige la primera por nombre", () => {
  expect(resolveActiveOrganization(orgs, undefined, "otra")).toBe("a");
});

test("sin fábricas devuelve null", () => {
  expect(resolveActiveOrganization([], "a", "a")).toBeNull();
});
