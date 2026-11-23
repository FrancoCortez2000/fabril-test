-- FABRIL · Reglas de catálogo: unidad estable, zona horaria válida, receta atómica y costo estándar.

-- La unidad de un ítem no cambia si ya tiene movimientos: las cantidades históricas perderían sentido.
create function private.guard_item_unit_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.unit_id is distinct from old.unit_id
     and exists (select 1 from public.stock_movements m where m.item_id = old.id) then
    raise exception 'No se puede cambiar la unidad de un ítem con movimientos' using errcode = 'P0001';
  end if;
  return new;
end
$$;

create trigger items_guard_unit before update of unit_id on public.items
  for each row execute function private.guard_item_unit_change();

-- La zona horaria tiene que existir: de ella dependen los cortes de día y de mes.
create function private.validate_org_timezone() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = new.timezone) then
    raise exception 'Zona horaria inválida' using errcode = 'P0001';
  end if;
  return new;
end
$$;

create trigger organizations_validate_timezone before insert or update of timezone on public.organizations
  for each row execute function private.validate_org_timezone();

-- Receta completa en un solo paso: crea o actualiza la receta y reemplaza todas sus líneas.
-- p_lines = [{ "componentItemId": uuid, "quantity": number, "wastePct": number | null }]
create function public.save_bom(
  p_item uuid,
  p_output_qty numeric,
  p_default_waste_pct numeric,
  p_notes text,
  p_lines jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
  v_name text;
  v_type text;
  v_actor uuid;
  v_bom uuid;
  v_line jsonb;
  v_component uuid;
  v_seen uuid[] := '{}';
begin
  select i.organization_id, i.name, i.type into v_org, v_name, v_type from public.items i where i.id = p_item;
  v_actor := private.require_role(v_org, '{admin}');

  if v_type is distinct from 'finished_good' then
    raise exception 'La receta tiene que ser de un producto terminado' using errcode = 'P0001';
  end if;
  if p_output_qty is null or p_output_qty <= 0 then
    raise exception 'El rendimiento tiene que ser mayor a cero' using errcode = 'P0001';
  end if;
  if p_default_waste_pct is not null and (p_default_waste_pct < 0 or p_default_waste_pct > 100) then
    raise exception 'El desperdicio tiene que estar entre 0 y 100 %%' using errcode = 'P0001';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'La receta necesita al menos una materia prima' using errcode = 'P0001';
  end if;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_component := nullif(v_line ->> 'componentItemId', '')::uuid;
    if v_component is null
       or not exists (
         select 1 from public.items c
          where c.id = v_component and c.organization_id = v_org and c.type = 'raw_material'
       ) then
      raise exception 'Cada componente tiene que ser una materia prima de esta fábrica' using errcode = 'P0001';
    end if;
    if v_component = any (v_seen) then
      raise exception 'No repitas una materia prima en la receta' using errcode = 'P0001';
    end if;
    v_seen := v_seen || v_component;
    if coalesce((v_line ->> 'quantity')::numeric, 0) <= 0 then
      raise exception 'La cantidad de cada materia prima tiene que ser mayor a cero' using errcode = 'P0001';
    end if;
    if (v_line ->> 'wastePct') is not null
       and ((v_line ->> 'wastePct')::numeric < 0 or (v_line ->> 'wastePct')::numeric > 100) then
      raise exception 'El desperdicio tiene que estar entre 0 y 100 %%' using errcode = 'P0001';
    end if;
  end loop;

  insert into public.boms (organization_id, item_id, output_qty, default_waste_pct, notes, created_by)
  values (v_org, p_item, p_output_qty, p_default_waste_pct, nullif(btrim(p_notes), ''), v_actor)
  on conflict (item_id) do update
    set output_qty = excluded.output_qty,
        default_waste_pct = excluded.default_waste_pct,
        notes = excluded.notes
  returning id into v_bom;

  delete from public.bom_lines where bom_id = v_bom;
  insert into public.bom_lines (organization_id, bom_id, component_item_id, quantity, waste_pct, position)
  select v_org, v_bom, (l.value ->> 'componentItemId')::uuid, (l.value ->> 'quantity')::numeric,
         (l.value ->> 'wastePct')::numeric, (l.ordinality - 1)::int
  from jsonb_array_elements(p_lines) with ordinality as l(value, ordinality);

  perform private.log_activity(v_org, v_actor, 'item', p_item, 'bom_saved', 'Actualizó la receta de ' || v_name);
  return v_bom;
end
$$;

revoke execute on function public.save_bom(uuid, numeric, numeric, text, jsonb) from public, anon;
grant execute on function public.save_bom(uuid, numeric, numeric, text, jsonb) to authenticated;

-- Costo estándar por unidad de producto: MISMA fórmula que private.create_production_order_core
-- (una orden de 1 unidad). Las funciones privadas no se pueden llamar con security_invoker, por eso
-- la fórmula de requerimiento se escribe en línea.
create view public.item_costing with (security_invoker = true) as
select
  i.id as item_id,
  i.organization_id,
  coalesce(m.materials_cost, 0)::numeric(14, 2) as materials_cost,
  round(i.standard_labor_minutes / 60 * o.default_labor_rate, 2)::numeric(14, 2) as labor_cost,
  round(i.overhead_per_unit, 2)::numeric(14, 2) as overhead_cost,
  (
    coalesce(m.materials_cost, 0)
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

revoke all on public.item_costing from anon, authenticated;
grant select on public.item_costing to anon, authenticated;
-- La demo pública necesita estos dos parámetros de la fábrica para el cálculo (no son datos sensibles).
grant select (default_waste_pct, default_labor_rate) on public.organizations to anon;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.user_org_ids(), private.user_admin_org_ids(), private.colleague_ids(),
  private.is_draft_purchase(uuid), private.is_active_production(uuid), private.uuid_or_null(text)
  to authenticated;
grant execute on function private.public_demo_org_id() to anon, authenticated;
