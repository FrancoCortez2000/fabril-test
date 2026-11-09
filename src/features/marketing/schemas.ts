import { z } from "zod";

const optionalText = (max: number, message: string) => z.string().trim().max(max, message);

export const demoRequestSchema = z.object({
  name: z.string().trim().min(2, "Ingresá tu nombre").max(80, "Máximo 80 caracteres"),
  company: z
    .string()
    .trim()
    .min(2, "Ingresá el nombre de tu empresa")
    .max(120, "Máximo 120 caracteres"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Ingresá un email válido, por ejemplo nombre@empresa.com.ar")),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || (v.length >= 6 && v.length <= 30), "Ingresá un teléfono válido"),
  industry: optionalText(80, "Máximo 80 caracteres"),
  message: optionalText(1000, "Máximo 1000 caracteres"),
  /** Campo trampa: invisible para las personas; los bots lo completan. */
  website: z.string().max(0),
});

export type DemoRequestValues = z.infer<typeof demoRequestSchema>;
