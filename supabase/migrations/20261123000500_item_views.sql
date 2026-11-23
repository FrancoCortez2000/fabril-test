-- FABRIL · Vistas de lectura para las fichas de ítems y el historial de movimientos.
-- Todas son security_invoker: la visibilidad la dan las políticas RLS de las tablas de origen.

-- item_catalog: se agrega `has_movements` (la unidad de un ítem con historia no se puede cambiar).
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
  exists (select 1 from public.stock_movements m where m.item_id = i.id) as has_movements
from public.items i
join public.units u on u.id = i.unit_id
left join public.categories c on c.id = i.category_id
join public.item_stock_status s on s.item_id = i.id
left join public.item_costing k on k.item_id = i.id;

-- Libro de movimientos con el ítem, el documento de origen (orden de compra o de producción) y si
-- se puede revertir a mano (sólo entradas, salidas y ajustes manuales que nadie revirtió).
create view public.movement_feed with (security_invoker = true) as
select
  m.id,
  m.organization_id,
  m.item_id,
  i.name as item_name,
  i.sku as item_sku,
  u.code as unit_code,
  m.movement_type,
  m.quantity,
  m.unit_cost,
  m.total_cost,
  m.balance_after,
  m.reason,
  m.occurred_at,
  m.production_order_id,
  m.purchase_receipt_line_id,
  m.reverses_movement_id,
  coalesce(op.code, po.code) as reference,
  (
    m.movement_type in ('manual_in', 'manual_out', 'adjustment')
    and m.reverses_movement_id is null
    and not exists (select 1 from public.stock_movements x where x.reverses_movement_id = m.id)
  ) as reversible,
  exists (select 1 from public.stock_movements x where x.reverses_movement_id = m.id) as reversed
from public.stock_movements m
join public.items i on i.id = m.item_id
join public.units u on u.id = i.unit_id
left join public.production_orders op on op.id = m.production_order_id
left join public.purchase_receipt_lines rl on rl.id = m.purchase_receipt_line_id
left join public.purchase_receipts rc on rc.id = rl.receipt_id
left join public.purchase_orders po on po.id = rc.purchase_order_id;

-- "Usado en": productos cuya receta lleva cada materia prima.
create view public.bom_usage with (security_invoker = true) as
select
  l.organization_id,
  l.component_item_id as item_id,
  b.item_id as product_id,
  p.name as product_name,
  p.sku as product_sku,
  l.quantity,
  l.waste_pct,
  b.output_qty
from public.bom_lines l
join public.boms b on b.id = l.bom_id
join public.items p on p.id = b.item_id;

-- Compras de cada materia prima, con su proveedor.
create view public.item_purchase_lines with (security_invoker = true) as
select
  pol.organization_id,
  pol.item_id,
  po.id as purchase_id,
  po.code as purchase_code,
  po.status,
  po.order_date,
  po.expected_date,
  pol.quantity,
  pol.received_qty,
  pol.unit_price,
  s.name as supplier_name
from public.purchase_order_lines pol
join public.purchase_orders po on po.id = pol.purchase_order_id
join public.suppliers s on s.id = po.supplier_id;

revoke all on public.movement_feed, public.bom_usage, public.item_purchase_lines from anon, authenticated;
grant select on public.movement_feed, public.bom_usage, public.item_purchase_lines to anon, authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.user_org_ids(), private.user_admin_org_ids(), private.colleague_ids(),
  private.is_draft_purchase(uuid), private.is_active_production(uuid), private.uuid_or_null(text)
  to authenticated;
grant execute on function private.public_demo_org_id() to anon, authenticated;
