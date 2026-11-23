-- FABRIL · item_costing: un producto sin receta no tiene costo estándar (antes daba 0 y margen 100 %).
-- Mismas columnas y misma fórmula que antes; sólo cambia que sin líneas de receta los costos de
-- materiales y el total son nulos.

create or replace view public.item_costing with (security_invoker = true) as
select
  i.id as item_id,
  i.organization_id,
  m.materials_cost::numeric(14, 2) as materials_cost,
  round(i.standard_labor_minutes / 60 * o.default_labor_rate, 2)::numeric(14, 2) as labor_cost,
  round(i.overhead_per_unit, 2)::numeric(14, 2) as overhead_cost,
  (
    m.materials_cost
    + round(i.standard_labor_minutes / 60 * o.default_labor_rate, 2)
    + round(i.overhead_per_unit, 2)
  )::numeric(14, 2) as standard_cost
from public.items i
join public.organizations o on o.id = i.organization_id
left join lateral (
  select sum(round(
    round(l.quantity / b.output_qty * (1 + coalesce(l.waste_pct, b.default_waste_pct, o.default_waste_pct) / 100), 3)
      * c.avg_cost, 2)) as materials_cost
  from public.boms b
  join public.bom_lines l on l.bom_id = b.id
  join public.items c on c.id = l.component_item_id
  where b.item_id = i.id
) m on true
where i.type = 'finished_good';

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.user_org_ids(), private.user_admin_org_ids(), private.colleague_ids(),
  private.is_draft_purchase(uuid), private.is_active_production(uuid), private.uuid_or_null(text)
  to authenticated;
grant execute on function private.public_demo_org_id() to anon, authenticated;
