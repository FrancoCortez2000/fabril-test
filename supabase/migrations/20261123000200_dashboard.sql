-- FABRIL · Dashboard: agregados en la base para no traer miles de filas al servidor.
--
-- dashboard_data es `security invoker`: la visibilidad la dan las políticas RLS (una fábrica ajena
-- devuelve todo en cero). recent_activity es `security definer` sólo para poder mostrar el primer
-- nombre de quien hizo cada cosa, y valida el acceso a mano.

-- "asOf": hoy en la zona horaria de la fábrica. En una demo envejecida es la fecha de su último
-- movimiento, para que el mes actual no aparezca vacío.
create function public.dashboard_data(p_org uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_tz text;
  v_is_demo boolean;
  v_today date;
  v_last date;
  v_as_of date;
  v_month_start date;
  v_prev_start date;
  v_prev_end date;
  v_kpis jsonb;
  v_production jsonb;
  v_flow jsonb;
  v_alerts jsonb;
begin
  select o.timezone, o.is_demo into v_tz, v_is_demo from public.organizations o where o.id = p_org;
  v_tz := coalesce(v_tz, 'America/Argentina/Buenos_Aires');
  v_today := (now() at time zone v_tz)::date;
  select max((m.occurred_at at time zone v_tz)::date) into v_last
    from public.stock_movements m where m.organization_id = p_org;
  v_as_of := case when coalesce(v_is_demo, false) and v_last is not null then least(v_today, v_last) else v_today end;
  v_month_start := date_trunc('month', v_as_of)::date;
  v_prev_start := (v_month_start - interval '1 month')::date;
  v_prev_end := least(v_prev_start + (extract(day from v_as_of)::int - 1), v_month_start - 1);

  select jsonb_build_object(
    'products', count(*) filter (where i.type = 'finished_good' and i.status = 'active' and i.archived_at is null),
    'rawMaterials', count(*) filter (where i.type = 'raw_material' and i.status = 'active' and i.archived_at is null),
    'inventoryValue', coalesce(round(sum(i.current_stock * i.avg_cost) filter (where i.archived_at is null and i.current_stock > 0), 2), 0)
  ) into v_kpis
  from public.items i where i.organization_id = p_org;

  v_kpis := v_kpis || jsonb_build_object(
    'activeOrders', (
      select count(*) from public.production_orders o
       where o.organization_id = p_org and o.status in ('planned', 'in_progress', 'quality_check')
    ),
    'unitsThisMonth', coalesce((
      select sum(m.quantity) from public.stock_movements m
       where m.organization_id = p_org and m.movement_type = 'production_output'
         and (m.occurred_at at time zone v_tz)::date between v_month_start and v_as_of
    ), 0),
    'unitsSamePeriodLastMonth', coalesce((
      select sum(m.quantity) from public.stock_movements m
       where m.organization_id = p_org and m.movement_type = 'production_output'
         and (m.occurred_at at time zone v_tz)::date between v_prev_start and v_prev_end
    ), 0)
  );

  with months as (
    select to_char(g, 'YYYY-MM') as month, g::date as month_start
      from generate_series(v_month_start - interval '11 months', v_month_start, interval '1 month') g
  ),
  moves as (
    select to_char(m.occurred_at at time zone v_tz, 'YYYY-MM') as month, m.movement_type, m.quantity, m.total_cost
      from public.stock_movements m
     where m.organization_id = p_org
       and (m.occurred_at at time zone v_tz)::date >= v_month_start - interval '11 months'
  )
  select
    (select jsonb_agg(jsonb_build_object(
        'month', mo.month,
        'units', coalesce((select sum(x.quantity) from moves x where x.month = mo.month and x.movement_type = 'production_output'), 0)
      ) order by mo.month) from months mo),
    (select jsonb_agg(jsonb_build_object(
        'month', mo.month,
        'inValue', coalesce((select sum(x.total_cost) from moves x where x.month = mo.month and x.quantity > 0), 0),
        'outValue', coalesce((select -sum(x.total_cost) from moves x where x.month = mo.month and x.quantity < 0), 0)
      ) order by mo.month) from months mo)
  into v_production, v_flow;

  select coalesce(jsonb_agg(jsonb_build_object(
      'kind', a.kind, 'title', a.title, 'detail', a.detail,
      'entityType', a.entity_type, 'entityId', a.entity_id, 'itemType', a.item_type
    ) order by a.rank, a.sort_key), '[]'::jsonb)
  into v_alerts
  from (
    select * from (
      select
        case s.level when 'out' then 1 else 2 end as rank,
        lower(i.name) as sort_key,
        case s.level when 'out' then 'out_of_stock' else 'low_stock' end as kind,
        case s.level when 'out' then i.name || ' sin stock' else i.name || ' con stock bajo' end as title,
        case s.level
          when 'out' then 'Sin stock disponible (mínimo ' || replace(trim_scale(i.min_stock)::text, '.', ',') || ' ' || u.code || ')'
          else 'Quedan ' || replace(trim_scale(i.current_stock)::text, '.', ',') || ' ' || u.code
               || ' (mínimo ' || replace(trim_scale(i.min_stock)::text, '.', ',') || ')'
        end as detail,
        'item'::text as entity_type, i.id as entity_id, i.type as item_type
      from public.items i
      join public.item_stock_status s on s.item_id = i.id
      join public.units u on u.id = i.unit_id
      where i.organization_id = p_org and i.archived_at is null and i.status = 'active'
        and i.min_stock > 0 and s.level in ('out', 'low')
      union all
      select 3, lower(o.code), 'delayed_order', o.code || ' demorada',
        it.name || ' · debía terminar el ' || to_char(o.planned_end_date, 'DD/MM/YYYY'),
        'production_order', o.id, null
      from public.production_orders o
      join public.items it on it.id = o.item_id
      where o.organization_id = p_org and o.status in ('planned', 'in_progress', 'quality_check')
        and o.planned_end_date is not null and o.planned_end_date < v_as_of
      union all
      select 4, lower(po.code), 'late_purchase', po.code || ' con entrega vencida',
        su.name || ' · esperada el ' || to_char(po.expected_date, 'DD/MM/YYYY'),
        'purchase_order', po.id, null
      from public.purchase_orders po
      join public.suppliers su on su.id = po.supplier_id
      where po.organization_id = p_org and po.status in ('pending', 'partially_received')
        and po.expected_date is not null and po.expected_date < v_as_of
    ) all_alerts
    order by rank, sort_key
    limit 20
  ) a;

  return jsonb_build_object(
    'asOf', to_char(v_as_of, 'YYYY-MM-DD'),
    'kpis', v_kpis,
    'monthlyProduction', coalesce(v_production, '[]'::jsonb),
    'inventoryFlow', coalesce(v_flow, '[]'::jsonb),
    'alerts', v_alerts
  );
end
$$;

create function public.recent_activity(p_org uuid, p_limit int default 8)
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
    coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'Sistema') as actor_name,
    a.occurred_at, a.entity_type, a.entity_id
  from public.activity_log a
  left join public.profiles p on p.id = a.actor_id
  where a.organization_id = p_org
    and (p_org in (select private.user_org_ids()) or p_org = private.public_demo_org_id())
  order by a.occurred_at desc, a.id
  limit least(greatest(coalesce(p_limit, 8), 1), 50)
$$;

revoke execute on function public.dashboard_data(uuid), public.recent_activity(uuid, int) from public;
grant execute on function public.dashboard_data(uuid), public.recent_activity(uuid, int) to anon, authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.user_org_ids(), private.user_admin_org_ids(), private.colleague_ids(),
  private.is_draft_purchase(uuid), private.is_active_production(uuid), private.uuid_or_null(text)
  to authenticated;
grant execute on function private.public_demo_org_id() to anon, authenticated;
