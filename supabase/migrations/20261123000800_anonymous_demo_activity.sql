-- FABRIL · La demo pública no muestra quién hizo cada cosa.
-- (1) `anon` deja de poder leer el autor de los registros (items.created_by, activity_log.actor_id).
-- (2) recent_activity muestra "Equipo" en lugar del nombre cuando quien mira no es miembro de la
--     fábrica (visitante anónimo o usuario de otra fábrica). Los miembros siguen viendo los nombres.

revoke select on public.items from anon;
grant select (
  id, organization_id, type, sku, name, description, category_id, unit_id, image_path, status,
  min_stock, sale_price, standard_labor_minutes, overhead_per_unit, preferred_supplier_id,
  last_purchase_cost, current_stock, avg_cost, archived_at, created_at, updated_at
) on public.items to anon;

revoke select on public.activity_log from anon;
grant select (id, organization_id, entity_type, entity_id, action, summary, metadata, occurred_at)
  on public.activity_log to anon;

create or replace function public.recent_activity(p_org uuid, p_limit int default 8)
returns table (
  id uuid,
  summary text,
  actor_name text,
  occurred_at timestamptz,
  entity_type text,
  entity_id uuid
)
language sql stable security definer set search_path = '' as $$
  select a.id, a.summary,
    case
      when p_org in (select private.user_org_ids())
        then coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'Sistema')
      else 'Equipo'
    end as actor_name,
    a.occurred_at, a.entity_type, a.entity_id
  from public.activity_log a
  left join public.profiles p on p.id = a.actor_id
  where a.organization_id = p_org
    and (p_org in (select private.user_org_ids()) or p_org = private.public_demo_org_id())
  order by a.occurred_at desc, a.id
  limit least(greatest(coalesce(p_limit, 8), 1), 50)
$$;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.user_org_ids(), private.user_admin_org_ids(), private.colleague_ids(),
  private.is_draft_purchase(uuid), private.is_active_production(uuid), private.uuid_or_null(text)
  to authenticated;
grant execute on function private.public_demo_org_id() to anon, authenticated;
