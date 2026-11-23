import "server-only";

import type { GeneralSettingsValues } from "@/features/settings/schemas";
import { createClient } from "@/lib/supabase/server";

/** Datos generales de la fábrica activa y si es una demo (para ofrecer "Restablecer datos demo"). */
export async function getOrganizationSettings(
  orgId: string,
): Promise<{ values: GeneralSettingsValues; isDemo: boolean } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select(
      "name, legal_name, cuit, address, city, province, phone, email, timezone, default_waste_pct, default_labor_rate, allow_negative_stock, is_demo",
    )
    .eq("id", orgId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    isDemo: data.is_demo,
    values: {
      name: data.name,
      legalName: data.legal_name ?? "",
      cuit: data.cuit ?? "",
      address: data.address ?? "",
      city: data.city ?? "",
      province: data.province ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      timezone: data.timezone,
      defaultWastePct: Number(data.default_waste_pct),
      defaultLaborRate: Number(data.default_labor_rate),
      allowNegativeStock: data.allow_negative_stock,
    },
  };
}
