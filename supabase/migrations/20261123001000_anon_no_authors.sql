-- FABRIL · La demo pública no muestra quién creó o modificó cada registro.
-- `anon` deja de poder leer las columnas created_by y actor_id de TODAS las tablas de `public`.
-- (items y activity_log ya se cerraron en 20261123000800.)

-- production_order_overview usaba `o.*` (incluía created_by): se recrea con las columnas explícitas.
drop view public.production_order_overview;
create view public.production_order_overview with (security_invoker = true) as
select
  o.id,
  o.organization_id,
  o.code,
  o.item_id,
  o.status,
  o.priority,
  o.planned_qty,
  o.good_qty,
  o.defective_qty,
  o.planned_start_date,
  o.planned_end_date,
  o.started_at,
  o.completed_at,
  o.cancelled_at,
  o.cancel_reason,
  o.notes,
  o.responsible_employee_id,
  o.planned_material_cost,
  o.planned_labor_cost,
  o.planned_overhead_cost,
  o.actual_material_cost,
  o.actual_labor_cost,
  o.actual_overhead_cost,
  o.actual_unit_cost,
  o.created_at,
  o.updated_at,
  i.name as item_name,
  i.sku as item_sku,
  u.code as unit_code,
  least(100, round(o.good_qty / o.planned_qty * 100))::int as progress_pct,
  (
    o.planned_end_date is not null
    and o.status in ('planned', 'in_progress', 'quality_check')
    and o.planned_end_date < (now() at time zone org.timezone)::date
  ) as is_delayed
from public.production_orders o
join public.items i on i.id = o.item_id
join public.units u on u.id = i.unit_id
join public.organizations org on org.id = o.organization_id;

revoke all on public.production_order_overview from anon, authenticated;
grant select on public.production_order_overview to anon, authenticated;

-- Para cada tabla que `anon` lee entera y tiene columnas de autor: lectura por columnas, sin ellas.
do $$
declare
  t record;
  cols text;
begin
  for t in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
       and has_table_privilege('anon', c.oid, 'select')
       and exists (
         select 1 from pg_attribute a
          where a.attrelid = c.oid and a.attname in ('created_by', 'actor_id') and not a.attisdropped
       )
  loop
    select string_agg(quote_ident(a.attname), ', ' order by a.attnum) into cols
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = t.relname and a.attnum > 0 and not a.attisdropped
       and a.attname not in ('created_by', 'actor_id');
    execute format('revoke select on public.%I from anon', t.relname);
    execute format('grant select (%s) on public.%I to anon', cols, t.relname);
  end loop;
end
$$;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.user_org_ids(), private.user_admin_org_ids(), private.colleague_ids(),
  private.is_draft_purchase(uuid), private.is_active_production(uuid), private.uuid_or_null(text)
  to authenticated;
grant execute on function private.public_demo_org_id() to anon, authenticated;
