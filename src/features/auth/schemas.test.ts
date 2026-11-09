import { loginSchema, recoverSchema, resetPasswordSchema } from "@/features/auth/schemas";

describe("loginSchema", () => {
  test("exige email válido y contraseña", () => {
    expect(loginSchema.safeParse({ email: "laura@fabrica.com.ar", password: "x" }).success).toBe(
      true,
    );
    const r = loginSchema.safeParse({ email: "laura@fabrica.com.ar", password: "" });
    expect(r.error?.issues[0]?.message).toBe("Ingresá tu contraseña");
  });
  test("normaliza el email (espacios y mayúsculas)", () => {
    expect(loginSchema.parse({ email: "  Laura@Fabrica.com.ar ", password: "x" }).email).toBe(
      "laura@fabrica.com.ar",
    );
  });
});

describe("recoverSchema", () => {
  test("rechaza un email inválido", () => {
    expect(recoverSchema.safeParse({ email: "laura" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  test("exige al menos una letra y un número", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "abcdefgh", confirm: "abcdefgh" }).success,
    ).toBe(false);
  });
  test("acepta una contraseña válida confirmada", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "abcdefg1", confirm: "abcdefg1" }).success,
    ).toBe(true);
  });
  test("las contraseñas tienen que coincidir", () => {
    const r = resetPasswordSchema.safeParse({ password: "abcdefg1", confirm: "abcdefg2" });
    expect(r.error?.issues[0]?.message).toBe("Las contraseñas no coinciden");
    expect(r.error?.issues[0]?.path).toEqual(["confirm"]);
  });
  test("exige al menos 8 caracteres", () => {
    expect(resetPasswordSchema.safeParse({ password: "abc1", confirm: "abc1" }).success).toBe(
      false,
    );
  });
});
