-- FABRIL · Inventario: libro de movimientos append-only, costo promedio ponderado y operaciones manuales.

-- Formato de cantidades igual a formatQuantity() de la app: "1.234,5" (hasta 3 decimales).
create function private.fmt_qty(p_value numeric) returns text
language plpgsql immutable set search_path = '' as $$
declare
  v text := to_char(round(abs(p_value), 3), 'FM999,999,999,990.000');
begin
  v := translate(v, ',.', '.,');
  v := regexp_replace(v, '0+$', '');
  v := regexp_replace(v, ',$', '');
  return case when p_value < 0 then '-' || v else v end;
end
$$;

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  item_id uuid not null,
  movement_type text not null check (movement_type in (
    'purchase_receipt', 'production_output', 'production_consumption', 'production_return',
    'production_scrap', 'adjustment', 'manual_in', 'manual_out', 'reversal'
  )),
  quantity numeric(14, 3) not null check (quantity <> 0),
  unit_cost numeric(14, 4),
  total_cost numeric(14, 2),
  balance_after numeric(14, 3),
  reason text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  -- Las FK de producción y compras se agregan en sus migraciones.
  production_order_id uuid,
  purchase_receipt_line_id uuid,
  reverses_movement_id uuid references public.stock_movements (id),
  foreign key (organization_id, item_id) references public.items (organization_id, id)
);
create index stock_movements_item_idx on public.stock_movements (organization_id, item_id, occurred_at);
create index stock_movements_org_occurred_idx on public.stock_movements (organization_id, occurred_at desc);
create index stock_movements_reverses_idx on public.stock_movements (reverses_movement_id);

-- Aplicación al stock y valorización (ver docs/plan-tecnico.md §4.2, reglas de valorización) -------------

create function private.apply_stock_movement() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_item record;
  v_allow boolean;
  s numeric;
  a numeric;
  q numeric := new.quantity;
  c numeric;
  v numeric;
  v_recalc boolean;
  v_new_avg numeric;
begin
  select i.id, i.name, i.current_stock, i.avg_cost, u.code as unit_code
    into v_item
    from public.items i
    join public.units u on u.id = i.unit_id
   where i.id = new.item_id and i.organization_id = new.organization_id
   for update of i;
  if not found then
    raise exception 'El ítem no existe en esta fábrica' using errcode = 'P0001';
  end if;

  select o.allow_negative_stock into v_allow from public.organizations o where o.id = new.organization_id;
  s := v_item.current_stock;
  a := v_item.avg_cost;

  if q < 0 and s + q < 0 and not coalesce(v_allow, false) then
    raise exception 'No hay stock suficiente de %: faltan % %',
      v_item.name, private.fmt_qty(-(s + q)), v_item.unit_code
      using errcode = 'P0001';
  end if;

  if new.movement_type = 'reversal' then
    c := new.unit_cost;
  elsif q < 0 or new.movement_type = 'adjustment' then
    c := a;
  elsif new.movement_type = 'manual_in' and new.unit_cost is null then
    c := a;
  else
    c := new.unit_cost;
  end if;
  if c is null or c < 0 then
    raise exception 'Falta el costo unitario del movimiento' using errcode = 'P0001';
  end if;

  v_recalc := new.movement_type in ('purchase_receipt', 'production_output', 'production_return', 'reversal')
    or (new.movement_type = 'manual_in' and new.unit_cost is not null);

  v_new_avg := a;
  if v_recalc then
    v := greatest(s, 0) * a + q * c;
    if s + q > 0 and v > 0 then
      v_new_avg := round(v / (s + q), 4);
    end if;
  end if;

  new.unit_cost := c;
  new.total_cost := round(q * c, 2);
  new.balance_after := s + q;

  update public.items set current_stock = s + q, avg_cost = v_new_avg where id = v_item.id;
  return new;
end
$$;

create trigger stock_movements_apply before insert on public.stock_movements
  for each row execute function private.apply_stock_movement();
create trigger stock_movements_immutable before update or delete on public.stock_movements
  for each row execute function private.reject_changes(
    'Los movimientos de stock no se modifican: registrá un ajuste o una anulación'
  );

-- Camino interno único para registrar movimientos (lo usan inventario, compras, producción y demo) ---------

create function private.insert_movement(
  p_org uuid,
  p_item uuid,
  p_type text,
  p_quantity numeric,
  p_unit_cost numeric,
  p_reason text,
  p_refs jsonb,
  p_actor uuid,
  p_at timestamptz
) returns public.stock_movements
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.stock_movements;
begin
  insert into public.stock_movements (
    organization_id, item_id, movement_type, quantity, unit_cost, reason, occurred_at, created_by,
    production_order_id, purchase_receipt_line_id, reverses_movement_id
  ) values (
    p_org, p_item, p_type, p_quantity, p_unit_cost, nullif(btrim(p_reason), ''), coalesce(p_at, now()), p_actor,
    (p_refs ->> 'production_order_id')::uuid,
    (p_refs ->> 'purchase_receipt_line_id')::uuid,
    (p_refs ->> 'reverses_movement_id')::uuid
  )
  returning * into v_row;
  return v_row;
end
$$;

create function private.require_reason(p_reason text, p_message text) returns text
language plpgsql immutable set search_path = '' as $$
begin
  if p_reason is null or char_length(btrim(p_reason)) < 3 then
    raise exception '%', p_message using errcode = 'P0001';
  end if;
  return btrim(p_reason);
end
$$;

-- RPC: ajuste por conteo físico -----------------------------------------------------------------

create function public.create_stock_adjustment(p_item uuid, p_counted_qty numeric, p_reason text)
returns public.stock_movements
language plpgsql security definer set search_path = '' as $$
declare
  v_item record;
  v_actor uuid;
  v_reason text;
  v_delta numeric;
  v_row public.stock_movements;
begin
  select i.id, i.organization_id, i.name, i.current_stock, u.code as unit_code into v_item
    from public.items i join public.units u on u.id = i.unit_id
   where i.id = p_item;
  v_actor := private.require_role(v_item.organization_id, '{admin}');
  v_reason := private.require_reason(p_reason, 'Indicá el motivo del ajuste');
  if p_counted_qty is null or p_counted_qty < 0 then
    raise exception 'El stock contado no puede ser negativo' using errcode = 'P0001';
  end if;

  perform 1 from public.items where id = p_item for update;
  select current_stock into v_item.current_stock from public.items where id = p_item;
  v_delta := round(p_counted_qty, 3) - v_item.current_stock;
  if v_delta = 0 then
    raise exception 'El stock contado coincide con el registrado: no hay nada que ajustar' using errcode = 'P0001';
  end if;

  v_row := private.insert_movement(v_item.organization_id, p_item, 'adjustment', v_delta, null, v_reason,
    '{}'::jsonb, v_actor, now());
  perform private.log_activity(v_item.organization_id, v_actor, 'item', p_item, 'stock_adjusted',
    'Ajustó el stock de ' || v_item.name || ': ' || case when v_delta > 0 then '+' else '' end
      || private.fmt_qty(v_delta) || ' ' || v_item.unit_code || ' (' || v_reason || ')',
    jsonb_build_object('movement_id', v_row.id));
  return v_row;
end
$$;

-- RPC: entradas y salidas manuales --------------------------------------------------------------

create function public.create_manual_movement(
  p_item uuid,
  p_type text,
  p_quantity numeric,
  p_reason text,
  p_unit_cost numeric default null
) returns public.stock_movements
language plpgsql security definer set search_path = '' as $$
declare
  v_item record;
  v_actor uuid;
  v_reason text;
  v_row public.stock_movements;
begin
  select i.id, i.organization_id, i.name, u.code as unit_code into v_item
    from public.items i join public.units u on u.id = i.unit_id
   where i.id = p_item;
  v_actor := private.require_role(v_item.organization_id, '{admin}');
  if p_type not in ('manual_in', 'manual_out') then
    raise exception 'Tipo de movimiento inválido' using errcode = 'P0001';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad tiene que ser mayor a cero' using errcode = 'P0001';
  end if;
  if p_unit_cost is not null and (p_unit_cost < 0 or p_type <> 'manual_in') then
    raise exception 'El costo sólo se informa en entradas y no puede ser negativo' using errcode = 'P0001';
  end if;
  v_reason := private.require_reason(p_reason, 'Indicá el motivo del movimiento');

  v_row := private.insert_movement(v_item.organization_id, p_item, p_type,
    case when p_type = 'manual_out' then -p_quantity else p_quantity end,
    p_unit_cost, v_reason, '{}'::jsonb, v_actor, now());
  perform private.log_activity(v_item.organization_id, v_actor, 'item', p_item, p_type,
    'Registró una ' || case when p_type = 'manual_in' then 'entrada' else 'salida' end || ' manual de '
      || private.fmt_qty(p_quantity) || ' ' || v_item.unit_code || ' de ' || v_item.name,
    jsonb_build_object('movement_id', v_row.id));
  return v_row;
end
$$;

-- RPC: anulación de movimientos manuales y ajustes ----------------------------------------------

create function public.reverse_stock_movement(p_movement uuid, p_reason text)
returns public.stock_movements
language plpgsql security definer set search_path = '' as $$
declare
  v_orig public.stock_movements;
  v_actor uuid;
  v_reason text;
  v_name text;
  v_row public.stock_movements;
begin
  select * into v_orig from public.stock_movements where id = p_movement;
  v_actor := private.require_role(v_orig.organization_id, '{admin}');
  v_reason := private.require_reason(p_reason, 'Indicá el motivo de la anulación');
  if v_orig.movement_type not in ('manual_in', 'manual_out', 'adjustment') then
    raise exception 'Este movimiento se corrige desde su compra u orden de producción' using errcode = 'P0001';
  end if;

  -- Serializa anulaciones del mismo movimiento.
  perform 1 from public.stock_movements where id = p_movement for update;
  if exists (select 1 from public.stock_movements r where r.reverses_movement_id = p_movement) then
    raise exception 'Este movimiento ya fue anulado' using errcode = 'P0001';
  end if;

  v_row := private.insert_movement(v_orig.organization_id, v_orig.item_id, 'reversal', -v_orig.quantity,
    v_orig.unit_cost, v_reason, jsonb_build_object('reverses_movement_id', v_orig.id), v_actor, now());
  select name into v_name from public.items where id = v_orig.item_id;
  perform private.log_activity(v_orig.organization_id, v_actor, 'item', v_orig.item_id, 'movement_reversed',
    'Anuló un movimiento de ' || v_name || ' (' || v_reason || ')',
    jsonb_build_object('movement_id', v_row.id, 'reversed_movement_id', v_orig.id));
  return v_row;
end
$$;

-- Vista de existencias ------------------------------------------------------------------------
-- `committed` se completa en la migración de producción.

create view public.item_stock_status with (security_invoker = true) as
select
  i.id as item_id,
  i.organization_id,
  i.type,
  i.min_stock,
  i.current_stock as physical,
  0::numeric(14, 3) as committed,
  i.current_stock as available,
  case
    when i.current_stock <= 0 then 'out'
    when i.current_stock < i.min_stock then 'low'
    else 'ok'
  end as level
from public.items i;

-- RLS y permisos ------------------------------------------------------------------------------

alter table public.stock_movements enable row level security;
revoke all on public.stock_movements from anon, authenticated;
grant select on public.stock_movements to authenticated;
create policy stock_movements_select on public.stock_movements for select to authenticated
  using (organization_id in (select private.user_org_ids()));

revoke all on public.item_stock_status from anon, authenticated;
grant select on public.item_stock_status to authenticated;

revoke execute on function
  public.create_stock_adjustment(uuid, numeric, text),
  public.create_manual_movement(uuid, text, numeric, text, numeric),
  public.reverse_stock_movement(uuid, text)
  from public, anon;
grant execute on function
  public.create_stock_adjustment(uuid, numeric, text),
  public.create_manual_movement(uuid, text, numeric, text, numeric),
  public.reverse_stock_movement(uuid, text)
  to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.user_org_ids(), private.user_admin_org_ids(), private.colleague_ids()
  to authenticated;
