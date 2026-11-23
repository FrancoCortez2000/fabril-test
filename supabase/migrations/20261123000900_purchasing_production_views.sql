-- FABRIL · Vistas de lectura de Compras y Producción para las listas y fichas.
-- Todas son security_invoker: la visibilidad la dan las políticas RLS de las tablas de origen (cada
-- fábrica ve lo suyo y la demo pública es legible para todos). No exponen created_by ni actor_id.

-- Órdenes de compra con proveedor, avance de recepción y marca de vencida.
create view public.purchase_overview with (security_invoker = true) as
select
  po.id,
  po.organization_id,
  po.code,
  po.status,
  po.order_date,
  po.expected_date,
  po.notes,
  po.subtotal,
  po.tax_total,
  po.total,
  po.cancel_reason,
  po.supplier_id,
  s.name as supplier_name,
  coalesce(l.line_count, 0)::int as line_count,
  coalesce(l.received_pct, 0)::int as received_pct,
  (
    po.status in ('pending', 'partially_received')
    and po.expected_date is not null
    and po.expected_date < (now() at time zone o.timezone)::date
  ) as is_late
from public.purchase_orders po
join public.suppliers s on s.id = po.supplier_id
join public.organizations o on o.id = po.organization_id
left join lateral (
  select
    count(*) as line_count,
    case when sum(pl.quantity) = 0 then 0
         else least(100, round(sum(pl.received_qty) / sum(pl.quantity) * 100)) end as received_pct
  from public.purchase_order_lines pl
  where pl.purchase_order_id = po.id
) l on true;

-- Líneas de cada orden de compra: pedido, recibido, pendiente y total sin IVA.
create view public.purchase_line_details with (security_invoker = true) as
select
  pl.id,
  pl.organization_id,
  pl.purchase_order_id,
  pl.item_id,
  i.name as item_name,
  i.sku as item_sku,
  u.code as unit_code,
  pl.quantity,
  pl.unit_price,
  pl.tax_rate,
  pl.received_qty,
  greatest(pl.quantity - pl.received_qty, 0)::numeric(14, 3) as pending_qty,
  round(pl.quantity * pl.unit_price, 2)::numeric(14, 2) as line_total
from public.purchase_order_lines pl
join public.items i on i.id = pl.item_id
join public.units u on u.id = i.unit_id;

-- Materiales de cada orden de producción, con lo que hay disponible hoy.
create view public.production_material_details with (security_invoker = true) as
select
  m.id,
  m.organization_id,
  m.production_order_id,
  m.item_id,
  i.name as item_name,
  i.sku as item_sku,
  u.code as unit_code,
  m.planned_qty,
  m.consumed_qty,
  m.returned_qty,
  m.scrap_qty,
  m.waste_pct,
  m.cost_consumed,
  s.available
from public.production_order_materials m
join public.items i on i.id = m.item_id
join public.units u on u.id = i.unit_id
join public.item_stock_status s on s.item_id = m.item_id;

-- Personal asignado a cada orden.
create view public.production_team with (security_invoker = true) as
select
  a.id,
  a.organization_id,
  a.production_order_id,
  a.employee_id,
  e.first_name,
  e.last_name,
  e.position,
  a.role_in_order,
  a.hours_worked
from public.production_order_assignments a
join public.employees e on e.id = a.employee_id;

-- Partes de avance con el nombre de quien los cargó.
create view public.production_report_details with (security_invoker = true) as
select
  r.id,
  r.organization_id,
  r.production_order_id,
  r.report_date,
  r.good_qty,
  r.defective_qty,
  r.notes,
  r.created_at,
  case when e.id is null then null else e.first_name || ' ' || e.last_name end as employee_name
from public.production_reports r
left join public.employees e on e.id = r.employee_id;

-- Historial de estados de la orden (sin el autor).
create view public.production_event_details with (security_invoker = true) as
select
  ev.id,
  ev.organization_id,
  ev.production_order_id,
  ev.from_status,
  ev.to_status,
  ev.note,
  ev.occurred_at
from public.production_order_events ev;

-- movement_feed: agrega el tipo y el id del documento de origen para poder enlazarlo.
create or replace view public.movement_feed with (security_invoker = true) as
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
  exists (select 1 from public.stock_movements x where x.reverses_movement_id = m.id) as reversed,
  case
    when m.production_order_id is not null then 'production_order'
    when po.id is not null then 'purchase_order'
  end as reference_type,
  coalesce(m.production_order_id, po.id) as reference_id
from public.stock_movements m
join public.items i on i.id = m.item_id
join public.units u on u.id = i.unit_id
left join public.production_orders op on op.id = m.production_order_id
left join public.purchase_receipt_lines rl on rl.id = m.purchase_receipt_line_id
left join public.purchase_receipts rc on rc.id = rl.receipt_id
left join public.purchase_orders po on po.id = rc.purchase_order_id;

revoke all on public.purchase_overview, public.purchase_line_details, public.production_material_details,
  public.production_team, public.production_report_details, public.production_event_details
  from anon, authenticated;
grant select on public.purchase_overview, public.purchase_line_details, public.production_material_details,
  public.production_team, public.production_report_details, public.production_event_details
  to anon, authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.user_org_ids(), private.user_admin_org_ids(), private.colleague_ids(),
  private.is_draft_purchase(uuid), private.is_active_production(uuid), private.uuid_or_null(text)
  to authenticated;
grant execute on function private.public_demo_org_id() to anon, authenticated;
