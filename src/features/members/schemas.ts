import { z } from "zod";

export const inviteMemberSchema = z.object({
  fullName: z.string().trim().min(2, "Ingresá el nombre y apellido").max(80, "Máximo 80 caracteres"),
  email: z.string().trim().toLowerCase().pipe(z.email("Ingresá un email válido")),
});
export type InviteMemberValues = z.infer<typeof inviteMemberSchema>;

export const memberStatusSchema = z.object({
  userId: z.uuid(),
  status: z.enum(["active", "disabled"]),
});

export const memberRefSchema = z.object({ userId: z.uuid() });

export type MemberRow = {
  userId: string;
  name: string;
  email: string;
  /** Pendiente: nunca ingresó (todavía no aceptó la invitación). */
  state: "active" | "pending" | "disabled";
  isCurrentUser: boolean;
};

export type InviteResult = { inviteUrl: string | null; existing: boolean };
