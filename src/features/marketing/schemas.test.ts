import { demoRequestSchema } from "@/features/marketing/schemas";

const minimal = {
  name: "Marta Gómez",
  company: "Envases del Paraná",
  email: "marta@envasesparana.com.ar",
  phone: "",
  industry: "",
  message: "",
  website: "",
};

test("acepta un envío mínimo (nombre, empresa y email)", () => {
  expect(demoRequestSchema.safeParse(minimal).success).toBe(true);
});

test("rechaza un email inválido", () => {
  const result = demoRequestSchema.safeParse({ ...minimal, email: "marta@" });
  expect(result.success).toBe(false);
  expect(result.error?.issues[0]?.path).toEqual(["email"]);
});

test("rechaza envíos con el campo trampa completo (spam)", () => {
  expect(demoRequestSchema.safeParse({ ...minimal, website: "http://spam.example" }).success).toBe(
    false,
  );
});

test("rechaza un teléfono demasiado corto si se completa", () => {
  expect(demoRequestSchema.safeParse({ ...minimal, phone: "123" }).success).toBe(false);
});
