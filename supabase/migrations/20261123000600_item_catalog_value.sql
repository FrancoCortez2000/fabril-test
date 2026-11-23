-- FABRIL · item_catalog: se agrega `stock_value` (stock × costo promedio) para ordenar y totalizar el inventario.

create or replace view public.item_catalog with (security_invoker = true) as
select
  i.id,
  i.organization_id,
  i.type,
  i.sku,
  i.name,
  i.description,
  i.category_id,
  c.name as category_name,
  i.unit_id,
  u.code as unit_code,
  i.min_stock,
  i.current_stock,
  i.avg_cost,
  i.last_purchase_cost,
  i.sale_price,
  i.standard_labor_minutes,
  i.overhead_per_unit,
  i.preferred_supplier_id,
  i.image_path,
  i.status,
  i.archived_at,
  s.level,
  s.committed,
  s.available,
  k.standard_cost,
  case when i.type = 'raw_material' then i.avg_cost else k.standard_cost end as cost,
  exists (select 1 from public.stock_movements m where m.item_id = i.id) as has_movements,
  round(i.current_stock * i.avg_cost, 2) as stock_value
from public.items i
join public.units u on u.id = i.unit_id
left join public.categories c on c.id = i.category_id
join public.item_stock_status s on s.item_id = i.id
left join public.item_costing k on k.item_id = i.id;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.user_org_ids(), private.user_admin_org_ids(), private.colleague_ids(),
  private.is_draft_purchase(uuid), private.is_active_production(uuid), private.uuid_or_null(text)
  to authenticated;
grant execute on function private.public_demo_org_id() to anon, authenticated;
