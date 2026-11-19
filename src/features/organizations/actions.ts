"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { createAction } from "@/lib/actions";
import { ACTIVE_ORG_COOKIE } from "@/lib/auth/active-org";
import { ActionError } from "@/lib/db-errors";

export const switchOrganization = createAction({
  schema: z.object({ organizationId: z.uuid() }),
  handler: async ({ organizationId }, { session, supabase }) => {
    if (!session.organizations.some((o) => o.id === organizationId)) {
      throw new ActionError("No tenés acceso a esa fábrica");
    }
    (await cookies()).set(ACTIVE_ORG_COOKIE, organizationId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    await supabase.from("profiles").update({ last_organization_id: organizationId }).eq("id", session.user.id);
    revalidatePath("/app", "layout");
    return null;
  },
});
