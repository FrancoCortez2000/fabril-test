"use server";

import { createHmac } from "node:crypto";

import { headers } from "next/headers";
import { z } from "zod";

import { demoRequestSchema } from "@/features/marketing/schemas";
import { createPublicAction } from "@/lib/actions";
import { getSecretKey } from "@/lib/env.server";
import { clientIp } from "@/lib/request-ip";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Solicitud de demostración de la landing. El navegador nunca escribe en la base: esta acción
 * valida, descarta bots (campo trampa) y llama a una función sólo para el servidor que limita
 * los envíos por conexión. La IP se guarda como hash, no en claro.
 */
export const submitDemoRequest = createPublicAction({
  schema: demoRequestSchema.extend({ website: z.string().max(500) }),
  handler: async (values) => {
    // Campo trampa completo: se responde igual que un envío exitoso, sin guardar nada.
    if (values.website) return null;

    const secret = getSecretKey();
    const ipHash = createHmac("sha256", secret)
      .update(clientIp(await headers()))
      .digest("hex");
    const { error } = await createAdminClient().rpc("submit_demo_request", {
      p_name: values.name,
      p_company: values.company,
      p_email: values.email,
      p_phone: values.phone,
      p_industry: values.industry,
      p_message: values.message,
      p_ip_hash: ipHash,
    });
    if (error) throw error;
    return null;
  },
});
