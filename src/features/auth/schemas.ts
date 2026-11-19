import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email("Ingresá un email válido"));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Ingresá tu contraseña"),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const recoverSchema = z.object({ email });
export type RecoverValues = z.infer<typeof recoverSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Usá al menos 8 caracteres")
      .regex(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/, "Incluí al menos una letra")
      .regex(/\d/, "Incluí al menos un número"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
