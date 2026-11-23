"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DEMO_COOKIE } from "@/lib/auth/demo";

/** "Salir de la demo": borra la cookie-bandera y vuelve al sitio. */
export async function exitDemo(): Promise<never> {
  (await cookies()).delete(DEMO_COOKIE);
  redirect("/");
}
