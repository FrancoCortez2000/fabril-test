import "server-only";

import { sanitizeSearch } from "@/features/items/search";
import { createClient } from "@/lib/supabase/server";

export type SearchHit = {
  kind: "product" | "raw_material" | "order" | "purchase";
  id: string;
  title: string;
  detail: string;
  href: string;
};

const PER_SOURCE = 5;
const MIN_TERM = 2;

/**
 * Busca registros de la fábrica por nombre, SKU o código: productos y materias primas, órdenes de
 * producción y compras (hasta 5 de cada una). El texto se sanea antes de armar el filtro y toda
 * consulta va acotada a la organización (además de lo que ya impone RLS).
 */
export async function searchRecords(orgId: string, term: string): Promise<SearchHit[]> {
  const q = sanitizeSearch(term);
  if (q.length < MIN_TERM) return [];
  const supabase = await createClient();

  const [items, orders, purchases] = await Promise.all([
    supabase
      .from("item_catalog")
      .select("id, type, sku, name")
      .eq("organization_id", orgId)
      .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
      .limit(PER_SOURCE),
    supabase
      .from("production_order_overview")
      .select("id, code, item_name")
      .eq("organization_id", orgId)
      .or(`code.ilike.%${q}%,item_name.ilike.%${q}%`)
      .limit(PER_SOURCE),
    supabase
      .from("purchase_overview")
      .select("id, code, supplier_name")
      .eq("organization_id", orgId)
      .or(`code.ilike.%${q}%,supplier_name.ilike.%${q}%`)
      .limit(PER_SOURCE),
  ]);
  for (const r of [items, orders, purchases]) if (r.error) throw r.error;

  return [
    ...(items.data ?? []).map((i): SearchHit => {
      const product = i.type === "finished_good";
      return {
        kind: product ? "product" : "raw_material",
        id: i.id as string,
        title: i.name as string,
        detail: i.sku as string,
        href: `/app/${product ? "productos" : "materias-primas"}/${i.id}`,
      };
    }),
    ...(orders.data ?? []).map((o): SearchHit => ({
      kind: "order",
      id: o.id as string,
      title: o.code as string,
      detail: o.item_name as string,
      href: `/app/produccion/${o.id}`,
    })),
    ...(purchases.data ?? []).map((p): SearchHit => ({
      kind: "purchase",
      id: p.id as string,
      title: p.code as string,
      detail: p.supplier_name as string,
      href: `/app/compras/${p.id}`,
    })),
  ];
}
