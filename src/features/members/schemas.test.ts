import { inviteMemberSchema, memberStatusSchema } from "@/features/members/schemas";

test("la invitación normaliza el email y exige nombre", () => {
  expect(
    inviteMemberSchema.parse({ fullName: " Carla Ruiz ", email: " Carla@Fabrica.com " }),
  ).toEqual({
    fullName: "Carla Ruiz",
    email: "carla@fabrica.com",
  });
  const bad = inviteMemberSchema.safeParse({ fullName: "", email: "no-es-email" });
  expect(bad.success).toBe(false);
  const messages = bad.error?.issues.map((i) => i.message);
  expect(messages).toContain("Ingresá el nombre y apellido");
  expect(messages).toContain("Ingresá un email válido");
});

test("el cambio de estado sólo acepta active o disabled y un id válido", () => {
  expect(
    memberStatusSchema.safeParse({
      userId: "11111111-1111-4111-8111-111111111111",
      status: "disabled",
    }).success,
  ).toBe(true);
  expect(memberStatusSchema.safeParse({ userId: "x", status: "disabled" }).success).toBe(false);
  expect(
    memberStatusSchema.safeParse({
      userId: "11111111-1111-4111-8111-111111111111",
      status: "admin",
    }).success,
  ).toBe(false);
});
