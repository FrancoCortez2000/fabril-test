-- FABRIL · Empleados y producción: órdenes, materiales, asignaciones, partes de avance e historial.
-- Procedimiento (docs/plan-tecnico.md §5.1): comprometer al planificar → consumir al iniciar → conciliar al completar.

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (organization_id, id)
);
create unique index areas_org_name_key on public.areas (organization_id, lower(name));

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 80),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 80),
  position text,
  area_id uuid,
  email text,
  phone text,
  hire_date date,
  status text not null default 'active' check (status in ('active', 'on_leave', 'inactive')),
  photo_path text,
  hourly_cost numeric(14, 2) check (hourly_cost >= 0),
  user_id uuid references public.profiles (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (organization_id, id),
  foreign key (organization_id, area_id) references public.areas (organization_id, id) on delete set null (area_id)
);
create index employees_org_idx on public.employees (organization_id);
create index employees_area_idx on public.employees (area_id);

create table public.production_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,
  item_id uuid not null,
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'quality_check', 'completed', 'cancelled')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  planned_qty numeric(14, 3) not null check (planned_qty > 0),
  good_qty numeric(14, 3) not null default 0 check (good_qty >= 0),
  defective_qty numeric(14, 3) not null default 0 check (defective_qty >= 0),
  planned_start_date date,
  planned_end_date date,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  notes text,
  responsible_employee_id uuid,
  planned_material_cost numeric(14, 2) not null default 0,
  planned_labor_cost numeric(14, 2) not null default 0,
  planned_overhead_cost numeric(14, 2) not null default 0,
  actual_material_cost numeric(14, 2),
  actual_labor_cost numeric(14, 2),
  actual_overhead_cost numeric(14, 2),
  actual_unit_cost numeric(14, 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (organization_id, id),
  unique (organization_id, code),
  check (planned_end_date is null or planned_start_date is null or planned_end_date >= planned_start_date),
  foreign key (organization_id, item_id) references public.items (organization_id, id),
  foreign key (organization_id, responsible_employee_id) references public.employees (organization_id, id)
    on delete set null (responsible_employee_id)
);
create index production_orders_org_status_idx on public.production_orders (organization_id, status);
create index production_orders_item_idx on public.production_orders (item_id);
create index production_orders_responsible_idx on public.production_orders (responsible_employee_id);

create table public.production_order_materials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  production_order_id uuid not null,
  item_id uuid not null,
  qty_per_unit numeric(14, 6) not null,
  waste_pct numeric(5, 2) not null default 0,
  planned_qty numeric(14, 3) not null,
  consumed_qty numeric(14, 3) not null default 0,
  unit_cost numeric(14, 4),
  cost_consumed numeric(14, 2) not null default 0,
  returned_qty numeric(14, 3) not null default 0,
  scrap_qty numeric(14, 3) not null default 0,
  unique (production_order_id, item_id),
  foreign key (organization_id, production_order_id) references public.production_orders (organization_id, id)
    on delete cascade,
  foreign key (organization_id, item_id) references public.items (organization_id, id)
);
create index production_order_materials_item_idx on public.production_order_materials (item_id);

create table public.production_order_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  production_order_id uuid not null,
  employee_id uuid not null,
  role_in_order text not null default 'operario' check (role_in_order in ('responsable', 'operario', 'calidad')),
  hours_worked numeric(8, 2) not null default 0 check (hours_worked >= 0),
  created_at timestamptz not null default now(),
  unique (production_order_id, employee_id),
  foreign key (organization_id, production_order_id) references public.production_orders (organization_id, id)
    on delete cascade,
  foreign key (organization_id, employee_id) references public.employees (organization_id, id) on delete cascade
);
create index production_order_assignments_employee_idx on public.production_order_assignments (employee_id);

create table public.production_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  production_order_id uuid not null,
  report_date date not null,
  good_qty numeric(14, 3) not null check (good_qty >= 0),
  defective_qty numeric(14, 3) not null check (defective_qty >= 0),
  employee_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  foreign key (organization_id, production_order_id) references public.production_orders (organization_id, id)
    on delete cascade,
  foreign key (organization_id, employee_id) references public.employees (organization_id, id)
    on delete set null (employee_id)
);
create index production_reports_order_idx on public.production_reports (production_order_id);
create index production_reports_employee_idx on public.production_reports (employee_id);

create table public.production_order_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  production_order_id uuid not null,
  from_status text,
  to_status text not null,
  note text,
  actor_id uuid,
  occurred_at timestamptz not null default now(),
  foreign key (organization_id, production_order_id) references public.production_orders (organization_id, id)
    on delete cascade
);
create index production_order_events_order_idx on public.production_order_events (production_order_id, occurred_at);

alter table public.stock_movements
  add foreign key (organization_id, production_order_id) references public.production_orders (organization_id, id)
  on delete cascade;
create index stock_movements_production_order_idx on public.stock_movements (production_order_id);

create trigger areas_updated_at before update on public.areas
  for each row execute function private.set_updated_at();
create trigger employees_updated_at before update on public.employees
  for each row execute function private.set_updated_at();
create trigger production_orders_updated_at before update on public.production_orders
  for each row execute function private.set_updated_at();
create trigger production_order_events_immutable before update or delete on public.production_order_events
  for each row execute function private.reject_changes('El historial de la orden no se modifica');

-- Helpers ---------------------------------------------------------------------------------

create function private.lock_production_order(p_id uuid) returns public.production_orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.production_orders;
begin
  select * into v_order from public.production_orders where id = p_id for update;
  if not found then
    raise exception 'La orden de producción no existe' using errcode = 'P0001';
  end if;
  return v_order;
end
$$;

create function private.production_event(
  p_order public.production_orders, p_from text, p_to text, p_note text, p_actor uuid, p_at timestamptz
) returns void
language sql security definer set search_path = '' as $$
  insert into public.production_order_events (organization_id, production_order_id, from_status, to_status, note, actor_id, occurred_at)
  values (p_order.organization_id, p_order.id, p_from, p_to, p_note, p_actor, p_at)
$$;

create function private.production_org(p_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select organization_id from public.production_orders where id = p_id
$$;

create function private.item_label(p_item uuid) returns text
language sql stable security definer set search_path = '' as $$
  select i.name from public.items i where i.id = p_item
$$;

-- Crear ------------------------------------------------------------------------------------

create function private.create_production_order_core(
  p_org uuid,
  p_item uuid,
  p_planned_qty numeric,
  p_planned_start date,
  p_planned_end date,
  p_priority text,
  p_responsible uuid,
  p_employee_ids uuid[],
  p_notes text,
  p_actor uuid,
  p_at timestamptz
) returns public.production_orders
language plpgsql security definer set search_path = '' as $$
declare
  v_item public.items;
  v_bom public.boms;
  v_org public.organizations;
  v_order public.production_orders;
  v_material numeric;
  v_unit text;
  v_emp uuid;
begin
  select * into v_item from public.items where id = p_item and organization_id = p_org;
  if not found or v_item.type <> 'finished_good' then
    raise exception 'Sólo se planifica la producción de productos terminados de esta fábrica' using errcode = 'P0001';
  end if;
  if p_planned_qty is null or p_planned_qty <= 0 then
    raise exception 'La cantidad a fabricar tiene que ser mayor a cero' using errcode = 'P0001';
  end if;
  select * into v_bom from public.boms where item_id = p_item;
  if not found or not exists (select 1 from public.bom_lines l where l.bom_id = v_bom.id) then
    raise exception 'El producto no tiene receta: cargala antes de planificar' using errcode = 'P0001';
  end if;
  select * into v_org from public.organizations where id = p_org;

  insert into public.production_orders (
    organization_id, code, item_id, priority, planned_qty, planned_start_date, planned_end_date,
    responsible_employee_id, notes, created_at, created_by
  ) values (
    p_org, private.next_document_code(p_org, 'OP', p_at), p_item, coalesce(p_priority, 'normal'), p_planned_qty,
    p_planned_start, p_planned_end, p_responsible, nullif(btrim(p_notes), ''), p_at, p_actor
  ) returning * into v_order;

  insert into public.production_order_materials (organization_id, production_order_id, item_id, qty_per_unit, waste_pct, planned_qty)
  select p_org, v_order.id, l.component_item_id,
    round(l.quantity / v_bom.output_qty, 6),
    coalesce(l.waste_pct, v_bom.default_waste_pct, v_org.default_waste_pct),
    private.bom_requirement(p_planned_qty, l.quantity, v_bom.output_qty,
      coalesce(l.waste_pct, v_bom.default_waste_pct, v_org.default_waste_pct))
  from public.bom_lines l
  where l.bom_id = v_bom.id;

  select coalesce(sum(round(m.planned_qty * i.avg_cost, 2)), 0) into v_material
    from public.production_order_materials m join public.items i on i.id = m.item_id
   where m.production_order_id = v_order.id;

  update public.production_orders set
    planned_material_cost = v_material,
    planned_labor_cost = round(p_planned_qty * v_item.standard_labor_minutes / 60 * v_org.default_labor_rate, 2),
    planned_overhead_cost = round(p_planned_qty * v_item.overhead_per_unit, 2)
  where id = v_order.id
  returning * into v_order;

  if p_responsible is not null then
    insert into public.production_order_assignments (organization_id, production_order_id, employee_id, role_in_order, created_at)
    values (p_org, v_order.id, p_responsible, 'responsable', p_at);
  end if;
  foreach v_emp in array coalesce(p_employee_ids, '{}'::uuid[]) loop
    insert into public.production_order_assignments (organization_id, production_order_id, employee_id, role_in_order, created_at)
    values (p_org, v_order.id, v_emp, 'operario', p_at)
    on conflict (production_order_id, employee_id) do nothing;
  end loop;

  select u.code into v_unit from public.units u where u.id = v_item.unit_id;
  perform private.production_event(v_order, null, 'planned', null, p_actor, p_at);
  perform private.log_activity(p_org, p_actor, 'production_order', v_order.id, 'created',
    'Planificó ' || v_order.code || ': ' || private.fmt_qty(p_planned_qty) || ' ' || v_unit || ' de ' || v_item.name,
    '{}'::jsonb, p_at);
  return v_order;
end
$$;

-- Iniciar ----------------------------------------------------------------------------------

create function private.start_production_order_core(p_id uuid, p_actor uuid, p_at timestamptz)
returns public.production_orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.production_orders := private.lock_production_order(p_id);
  v_allow boolean;
  v_missing text;
  v_mat record;
  v_mov public.stock_movements;
begin
  if v_order.status <> 'planned' then
    raise exception 'La orden % ya no está planificada', v_order.code using errcode = 'P0001';
  end if;
  select allow_negative_stock into v_allow from public.organizations where id = v_order.organization_id;

  -- Bloquea los ítems en orden estable y verifica todo antes de mover stock.
  perform 1 from public.items i
   where i.id in (select m.item_id from public.production_order_materials m where m.production_order_id = p_id)
   order by i.id for update;
  if not v_allow then
    select string_agg(i.name || ' faltan ' || private.fmt_qty(m.planned_qty - i.current_stock) || ' ' || u.code, '; ' order by i.name)
      into v_missing
      from public.production_order_materials m
      join public.items i on i.id = m.item_id
      join public.units u on u.id = i.unit_id
     where m.production_order_id = p_id and m.planned_qty > i.current_stock;
    if v_missing is not null then
      raise exception 'No hay stock suficiente para iniciar: %', v_missing using errcode = 'P0001';
    end if;
  end if;

  for v_mat in select * from public.production_order_materials where production_order_id = p_id order by item_id loop
    v_mov := private.insert_movement(v_order.organization_id, v_mat.item_id, 'production_consumption', -v_mat.planned_qty,
      null, 'Consumo ' || v_order.code, jsonb_build_object('production_order_id', p_id), p_actor, p_at);
    update public.production_order_materials set
      consumed_qty = v_mat.planned_qty,
      unit_cost = v_mov.unit_cost,
      cost_consumed = -v_mov.total_cost
    where id = v_mat.id;
  end loop;

  update public.production_orders set status = 'in_progress', started_at = p_at where id = p_id returning * into v_order;
  perform private.production_event(v_order, 'planned', 'in_progress', null, p_actor, p_at);
  perform private.log_activity(v_order.organization_id, p_actor, 'production_order', p_id, 'started',
    'Inició ' || v_order.code || ' (' || private.item_label(v_order.item_id) || ')', '{}'::jsonb, p_at);
  return v_order;
end
$$;

-- Partes de avance y transiciones de calidad -------------------------------------------------------

create function private.report_production_progress_core(
  p_id uuid, p_good numeric, p_defective numeric, p_employee uuid, p_report_date date, p_notes text,
  p_actor uuid, p_at timestamptz
) returns public.production_orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.production_orders := private.lock_production_order(p_id);
  v_good numeric := round(coalesce(p_good, 0), 3);
  v_def numeric := round(coalesce(p_defective, 0), 3);
begin
  if v_order.status <> 'in_progress' then
    raise exception 'La orden % no está en producción', v_order.code using errcode = 'P0001';
  end if;
  if v_good < 0 or v_def < 0 or v_good + v_def = 0 then
    raise exception 'Indicá unidades buenas o defectuosas (mayores a cero)' using errcode = 'P0001';
  end if;
  insert into public.production_reports (organization_id, production_order_id, report_date, good_qty, defective_qty, employee_id, notes, created_at, created_by)
  values (v_order.organization_id, p_id, coalesce(p_report_date, private.org_today(v_order.organization_id, p_at)),
    v_good, v_def, p_employee, nullif(btrim(p_notes), ''), p_at, p_actor);
  update public.production_orders set good_qty = good_qty + v_good, defective_qty = defective_qty + v_def
   where id = p_id returning * into v_order;
  perform private.production_event(v_order, 'in_progress', 'in_progress',
    'Parte de avance: ' || private.fmt_qty(v_good) || ' buenas, ' || private.fmt_qty(v_def) || ' defectuosas',
    p_actor, p_at);
  return v_order;
end
$$;

create function private.send_to_quality_check_core(p_id uuid, p_actor uuid, p_at timestamptz)
returns public.production_orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.production_orders := private.lock_production_order(p_id);
begin
  if v_order.status <> 'in_progress' then
    raise exception 'La orden % no está en producción', v_order.code using errcode = 'P0001';
  end if;
  update public.production_orders set status = 'quality_check' where id = p_id returning * into v_order;
  perform private.production_event(v_order, 'in_progress', 'quality_check', null, p_actor, p_at);
  perform private.log_activity(v_order.organization_id, p_actor, 'production_order', p_id, 'quality_check',
    'Pasó ' || v_order.code || ' a control de calidad', '{}'::jsonb, p_at);
  return v_order;
end
$$;

create function private.return_to_production_core(p_id uuid, p_note text, p_actor uuid, p_at timestamptz)
returns public.production_orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.production_orders := private.lock_production_order(p_id);
  v_note text := private.require_reason(p_note, 'Indicá por qué vuelve a producción');
begin
  if v_order.status <> 'quality_check' then
    raise exception 'La orden % no está en control de calidad', v_order.code using errcode = 'P0001';
  end if;
  update public.production_orders set status = 'in_progress' where id = p_id returning * into v_order;
  perform private.production_event(v_order, 'quality_check', 'in_progress', v_note, p_actor, p_at);
  return v_order;
end
$$;

-- Completar --------------------------------------------------------------------------------

create function private.complete_production_order_core(
  p_id uuid, p_good numeric, p_defective numeric, p_consumptions jsonb, p_hours jsonb, p_note text,
  p_actor uuid, p_at timestamptz
) returns public.production_orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.production_orders := private.lock_production_order(p_id);
  v_org public.organizations;
  v_item public.items;
  v_good numeric := round(coalesce(p_good, -1), 3);
  v_def numeric := round(coalesce(p_defective, -1), 3);
  v_entry jsonb;
  v_mat record;
  v_real numeric;
  v_diff numeric;
  v_mov public.stock_movements;
  v_material numeric;
  v_labor numeric;
  v_overhead numeric;
  v_unit numeric;
  v_note text;
  v_unit_code text;
begin
  if v_order.status <> 'quality_check' then
    raise exception 'La orden % no está en control de calidad', v_order.code using errcode = 'P0001';
  end if;
  if v_good < 0 or v_def < 0 then
    raise exception 'Indicá las cantidades finales de unidades buenas y defectuosas' using errcode = 'P0001';
  end if;
  select * into v_org from public.organizations where id = v_order.organization_id;
  select * into v_item from public.items where id = v_order.item_id;

  -- Validación de los consumos informados.
  for v_entry in select * from jsonb_array_elements(coalesce(p_consumptions, '[]'::jsonb)) loop
    if not exists (select 1 from public.production_order_materials m
                   where m.production_order_id = p_id and m.item_id = (v_entry ->> 'item_id')::uuid) then
      raise exception 'El material informado no pertenece a la orden %', v_order.code using errcode = 'P0001';
    end if;
    if (v_entry ->> 'quantity')::numeric < 0 then
      raise exception 'El consumo real no puede ser negativo' using errcode = 'P0001';
    end if;
  end loop;

  -- Conciliación por material: devolución del sobrante o merma por exceso.
  for v_mat in select * from public.production_order_materials where production_order_id = p_id order by item_id loop
    select round((e ->> 'quantity')::numeric, 3) into v_real
      from jsonb_array_elements(coalesce(p_consumptions, '[]'::jsonb)) e
     where (e ->> 'item_id')::uuid = v_mat.item_id
     limit 1;
    v_real := coalesce(v_real, v_mat.consumed_qty);
    v_diff := v_real - v_mat.consumed_qty;
    if v_diff < 0 then
      v_mov := private.insert_movement(v_order.organization_id, v_mat.item_id, 'production_return', -v_diff,
        v_mat.unit_cost, 'Sobrante ' || v_order.code, jsonb_build_object('production_order_id', p_id), p_actor, p_at);
      update public.production_order_materials set
        consumed_qty = v_real, returned_qty = returned_qty - v_diff, cost_consumed = cost_consumed - v_mov.total_cost
      where id = v_mat.id;
    elsif v_diff > 0 then
      v_mov := private.insert_movement(v_order.organization_id, v_mat.item_id, 'production_scrap', -v_diff,
        null, 'Exceso de consumo ' || v_order.code, jsonb_build_object('production_order_id', p_id), p_actor, p_at);
      update public.production_order_materials set
        consumed_qty = v_real, scrap_qty = scrap_qty + v_diff, cost_consumed = cost_consumed - v_mov.total_cost
      where id = v_mat.id;
    end if;
  end loop;

  -- Horas trabajadas.
  for v_entry in select * from jsonb_array_elements(coalesce(p_hours, '[]'::jsonb)) loop
    if (v_entry ->> 'hours')::numeric < 0 then
      raise exception 'Las horas trabajadas no pueden ser negativas' using errcode = 'P0001';
    end if;
    insert into public.production_order_assignments (organization_id, production_order_id, employee_id, role_in_order, hours_worked, created_at)
    values (v_order.organization_id, p_id, (v_entry ->> 'employee_id')::uuid, 'operario', (v_entry ->> 'hours')::numeric, p_at)
    on conflict (production_order_id, employee_id) do update set hours_worked = excluded.hours_worked;
  end loop;

  select coalesce(sum(m.cost_consumed), 0) into v_material
    from public.production_order_materials m where m.production_order_id = p_id;
  select coalesce(sum(round(a.hours_worked * coalesce(e.hourly_cost, v_org.default_labor_rate), 2)), 0) into v_labor
    from public.production_order_assignments a join public.employees e on e.id = a.employee_id
   where a.production_order_id = p_id;
  v_overhead := round(v_good * v_item.overhead_per_unit, 2);
  v_unit := case when v_good > 0 then round((v_material + v_labor + v_overhead) / v_good, 4) end;

  if v_good > 0 then
    perform private.insert_movement(v_order.organization_id, v_order.item_id, 'production_output', v_good, v_unit,
      'Producción ' || v_order.code, jsonb_build_object('production_order_id', p_id), p_actor, p_at);
  end if;

  if v_good <> v_order.good_qty or v_def <> v_order.defective_qty then
    if v_good < v_order.good_qty and v_order.good_qty - v_good = v_def - v_order.defective_qty then
      v_note := 'Calidad reclasificó ' || private.fmt_qty(v_order.good_qty - v_good) || ' unidades como defectuosas';
    else
      v_note := 'Calidad ajustó las cantidades finales: ' || private.fmt_qty(v_good) || ' buenas y '
        || private.fmt_qty(v_def) || ' defectuosas (partes de avance: ' || private.fmt_qty(v_order.good_qty)
        || ' y ' || private.fmt_qty(v_order.defective_qty) || ')';
    end if;
  end if;

  update public.production_orders set
    status = 'completed', completed_at = p_at, good_qty = v_good, defective_qty = v_def,
    actual_material_cost = v_material, actual_labor_cost = v_labor, actual_overhead_cost = v_overhead,
    actual_unit_cost = v_unit
  where id = p_id returning * into v_order;

  perform private.production_event(v_order, 'quality_check', 'completed',
    nullif(concat_ws('. ', v_note, nullif(btrim(p_note), '')), ''), p_actor, p_at);
  select u.code into v_unit_code from public.units u where u.id = v_item.unit_id;
  perform private.log_activity(v_order.organization_id, p_actor, 'production_order', p_id, 'completed',
    'Completó ' || v_order.code || ': ' || private.fmt_qty(v_good) || ' ' || v_unit_code || ' de ' || v_item.name,
    '{}'::jsonb, p_at);
  return v_order;
end
$$;

-- Cancelar ----------------------------------------------------------------------------------

create function private.cancel_production_order_core(
  p_id uuid, p_reason text, p_returns jsonb, p_actor uuid, p_at timestamptz
) returns public.production_orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.production_orders := private.lock_production_order(p_id);
  v_reason text := private.require_reason(p_reason, 'Indicá el motivo de la cancelación');
  v_from text := v_order.status;
  v_entry jsonb;
  v_mat record;
  v_qty numeric;
  v_mov public.stock_movements;
begin
  if v_order.status not in ('planned', 'in_progress', 'quality_check') then
    raise exception 'La orden % no se puede cancelar en su estado actual', v_order.code using errcode = 'P0001';
  end if;

  if v_order.status <> 'planned' then
    for v_entry in select * from jsonb_array_elements(coalesce(p_returns, '[]'::jsonb)) loop
      v_qty := round((v_entry ->> 'quantity')::numeric, 3);
      if v_qty is null or v_qty <= 0 then
        continue;
      end if;
      select m.*, i.name as item_name, u.code as unit_code into v_mat
        from public.production_order_materials m
        join public.items i on i.id = m.item_id
        join public.units u on u.id = i.unit_id
       where m.production_order_id = p_id and m.item_id = (v_entry ->> 'item_id')::uuid
       for update of m;
      if not found then
        raise exception 'El material informado no pertenece a la orden %', v_order.code using errcode = 'P0001';
      end if;
      if v_qty > v_mat.consumed_qty - v_mat.returned_qty then
        raise exception 'No podés devolver más de lo consumido: se usaron % % de %',
          private.fmt_qty(v_mat.consumed_qty - v_mat.returned_qty), v_mat.unit_code, v_mat.item_name
          using errcode = 'P0001';
      end if;
      v_mov := private.insert_movement(v_order.organization_id, v_mat.item_id, 'production_return', v_qty, v_mat.unit_cost,
        'Devolución por cancelación ' || v_order.code, jsonb_build_object('production_order_id', p_id), p_actor, p_at);
      update public.production_order_materials set
        returned_qty = returned_qty + v_qty, cost_consumed = cost_consumed - v_mov.total_cost
      where id = v_mat.id;
    end loop;
    -- Lo no devuelto ya salió del stock al iniciar: queda registrado como desperdicio de la orden.
    update public.production_order_materials set scrap_qty = consumed_qty - returned_qty
     where production_order_id = p_id;
  end if;

  update public.production_orders set
    status = 'cancelled', cancelled_at = p_at, cancel_reason = v_reason,
    actual_material_cost = case when v_from = 'planned' then null
      else (select coalesce(sum(m.cost_consumed), 0) from public.production_order_materials m where m.production_order_id = p_id) end
  where id = p_id returning * into v_order;
  perform private.production_event(v_order, v_from, 'cancelled', v_reason, p_actor, p_at);
  perform private.log_activity(v_order.organization_id, p_actor, 'production_order', p_id, 'cancelled',
    'Canceló ' || v_order.code || ' (' || v_reason || ')', '{}'::jsonb, p_at);
  return v_order;
end
$$;

-- Faltantes → borrador de compra ----------------------------------------------------------------

create function private.create_purchase_from_shortages_core(p_order uuid, p_supplier uuid, p_actor uuid, p_at timestamptz)
returns public.purchase_orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.production_orders := private.lock_production_order(p_order);
  v_po public.purchase_orders;
  v_count int;
begin
  if v_order.status <> 'planned' then
    raise exception 'Sólo las órdenes planificadas generan compras de faltantes' using errcode = 'P0001';
  end if;

  create temporary table if not exists pg_temp.fabril_shortages (item_id uuid, quantity numeric, unit_price numeric) on commit drop;
  delete from pg_temp.fabril_shortages;
  insert into pg_temp.fabril_shortages
  select m.item_id,
    m.planned_qty - greatest(s.available + m.planned_qty, 0),
    coalesce(i.last_purchase_cost, i.avg_cost)
  from public.production_order_materials m
  join public.item_stock_status s on s.item_id = m.item_id
  join public.items i on i.id = m.item_id
  where m.production_order_id = p_order
    and m.planned_qty > greatest(s.available + m.planned_qty, 0);

  select count(*) into v_count from pg_temp.fabril_shortages;
  if v_count = 0 then
    raise exception 'Esta orden no tiene faltantes de material' using errcode = 'P0001';
  end if;

  insert into public.purchase_orders (organization_id, supplier_id, notes, created_at, created_by)
  values (v_order.organization_id, p_supplier, 'Faltantes de ' || v_order.code, p_at, p_actor)
  returning * into v_po;
  insert into public.purchase_order_lines (organization_id, purchase_order_id, item_id, quantity, unit_price, tax_rate)
  select v_order.organization_id, v_po.id, s.item_id, s.quantity, s.unit_price, 21 from pg_temp.fabril_shortages s;
  select * into v_po from public.purchase_orders where id = v_po.id;

  perform private.log_activity(v_order.organization_id, p_actor, 'purchase_order', v_po.id, 'created',
    'Creó ' || v_po.code || ' con los faltantes de ' || v_order.code, '{}'::jsonb, p_at);
  return v_po;
end
$$;

-- RPC públicas --------------------------------------------------------------------------------

create function public.create_production_order(
  p_item uuid, p_planned_qty numeric, p_planned_start date, p_planned_end date, p_priority text,
  p_responsible uuid, p_employee_ids uuid[], p_notes text
) returns public.production_orders
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := (select organization_id from public.items where id = p_item);
begin
  return private.create_production_order_core(v_org, p_item, p_planned_qty, p_planned_start, p_planned_end,
    p_priority, p_responsible, p_employee_ids, p_notes, private.require_role(v_org, '{admin}'), now());
end
$$;

create function public.start_production_order(p_id uuid) returns public.production_orders
language plpgsql security definer set search_path = '' as $$
begin
  return private.start_production_order_core(p_id, private.require_role(private.production_org(p_id), '{admin}'), now());
end
$$;

create function public.report_production_progress(
  p_id uuid, p_good numeric, p_defective numeric, p_employee uuid, p_report_date date, p_notes text
) returns public.production_orders
language plpgsql security definer set search_path = '' as $$
begin
  return private.report_production_progress_core(p_id, p_good, p_defective, p_employee, p_report_date, p_notes,
    private.require_role(private.production_org(p_id), '{admin}'), now());
end
$$;

create function public.send_to_quality_check(p_id uuid) returns public.production_orders
language plpgsql security definer set search_path = '' as $$
begin
  return private.send_to_quality_check_core(p_id, private.require_role(private.production_org(p_id), '{admin}'), now());
end
$$;

create function public.return_to_production(p_id uuid, p_note text) returns public.production_orders
language plpgsql security definer set search_path = '' as $$
begin
  return private.return_to_production_core(p_id, p_note,
    private.require_role(private.production_org(p_id), '{admin}'), now());
end
$$;

create function public.complete_production_order(
  p_id uuid, p_good numeric, p_defective numeric, p_consumptions jsonb, p_hours jsonb, p_note text
) returns public.production_orders
language plpgsql security definer set search_path = '' as $$
begin
  return private.complete_production_order_core(p_id, p_good, p_defective, p_consumptions, p_hours, p_note,
    private.require_role(private.production_org(p_id), '{admin}'), now());
end
$$;

create function public.cancel_production_order(p_id uuid, p_reason text, p_returns jsonb) returns public.production_orders
language plpgsql security definer set search_path = '' as $$
begin
  return private.cancel_production_order_core(p_id, p_reason, p_returns,
    private.require_role(private.production_org(p_id), '{admin}'), now());
end
$$;

create function public.create_purchase_from_shortages(p_order uuid, p_supplier uuid) returns public.purchase_orders
language plpgsql security definer set search_path = '' as $$
begin
  return private.create_purchase_from_shortages_core(p_order, p_supplier,
    private.require_role(private.production_org(p_order), '{admin}'), now());
end
$$;

-- Vistas -------------------------------------------------------------------------------------

create or replace view public.item_stock_status with (security_invoker = true) as
with committed as (
  select m.item_id, sum(m.planned_qty - m.consumed_qty) as qty
  from public.production_order_materials m
  join public.production_orders o on o.id = m.production_order_id
  where o.status = 'planned'
  group by m.item_id
)
select
  i.id as item_id,
  i.organization_id,
  i.type,
  i.min_stock,
  i.current_stock as physical,
  coalesce(c.qty, 0)::numeric(14, 3) as committed,
  (i.current_stock - coalesce(c.qty, 0))::numeric(14, 3) as available,
  case
    when i.current_stock <= 0 then 'out'
    when i.current_stock < i.min_stock then 'low'
    else 'ok'
  end as level
from public.items i
left join committed c on c.item_id = i.id;

create view public.production_order_overview with (security_invoker = true) as
select
  o.*,
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

-- RLS y permisos -------------------------------------------------------------------------------

alter table public.areas enable row level security;
alter table public.employees enable row level security;
alter table public.production_orders enable row level security;
alter table public.production_order_materials enable row level security;
alter table public.production_order_assignments enable row level security;
alter table public.production_reports enable row level security;
alter table public.production_order_events enable row level security;

revoke all on public.areas, public.employees, public.production_orders, public.production_order_materials,
  public.production_order_assignments, public.production_reports, public.production_order_events,
  public.production_order_overview
  from anon, authenticated;

grant select, insert, delete on public.areas to authenticated;
grant update (name) on public.areas to authenticated;
grant select, insert, delete on public.employees to authenticated;
grant update (first_name, last_name, position, area_id, email, phone, hire_date, status, photo_path, hourly_cost,
  user_id, notes) on public.employees to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['areas', 'employees'] loop
    execute format(
      'create policy %1$s_select on public.%1$s for select to authenticated
         using (organization_id in (select private.user_org_ids()))', t);
    execute format(
      'create policy %1$s_insert on public.%1$s for insert to authenticated
         with check (organization_id in (select private.user_admin_org_ids()))', t);
    execute format(
      'create policy %1$s_update on public.%1$s for update to authenticated
         using (organization_id in (select private.user_admin_org_ids()))
         with check (organization_id in (select private.user_admin_org_ids()))', t);
    execute format(
      'create policy %1$s_delete on public.%1$s for delete to authenticated
         using (organization_id in (select private.user_admin_org_ids()))', t);
  end loop;
  foreach t in array array['production_orders', 'production_order_materials', 'production_order_assignments',
                           'production_reports', 'production_order_events'] loop
    execute format(
      'create policy %1$s_select on public.%1$s for select to authenticated
         using (organization_id in (select private.user_org_ids()))', t);
  end loop;
end
$$;

grant select on public.production_orders, public.production_order_materials, public.production_order_assignments,
  public.production_reports, public.production_order_events, public.production_order_overview to authenticated;

-- Edición directa de datos de planificación mientras la orden está activa.
grant update (priority, planned_start_date, planned_end_date, notes, responsible_employee_id)
  on public.production_orders to authenticated;
create policy production_orders_update on public.production_orders for update to authenticated
  using (organization_id in (select private.user_admin_org_ids()) and status in ('planned', 'in_progress', 'quality_check'))
  with check (organization_id in (select private.user_admin_org_ids()) and status in ('planned', 'in_progress', 'quality_check'));

create function private.is_active_production(p_order uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.production_orders o
                 where o.id = p_order and o.status in ('planned', 'in_progress', 'quality_check'))
$$;

grant insert (organization_id, production_order_id, employee_id, role_in_order), delete
  on public.production_order_assignments to authenticated;
create policy production_order_assignments_insert on public.production_order_assignments for insert to authenticated
  with check (organization_id in (select private.user_admin_org_ids()) and private.is_active_production(production_order_id));
create policy production_order_assignments_delete on public.production_order_assignments for delete to authenticated
  using (organization_id in (select private.user_admin_org_ids()) and private.is_active_production(production_order_id));

revoke execute on function
  public.create_production_order(uuid, numeric, date, date, text, uuid, uuid[], text),
  public.start_production_order(uuid),
  public.report_production_progress(uuid, numeric, numeric, uuid, date, text),
  public.send_to_quality_check(uuid),
  public.return_to_production(uuid, text),
  public.complete_production_order(uuid, numeric, numeric, jsonb, jsonb, text),
  public.cancel_production_order(uuid, text, jsonb),
  public.create_purchase_from_shortages(uuid, uuid)
  from public, anon;
grant execute on function
  public.create_production_order(uuid, numeric, date, date, text, uuid, uuid[], text),
  public.start_production_order(uuid),
  public.report_production_progress(uuid, numeric, numeric, uuid, date, text),
  public.send_to_quality_check(uuid),
  public.return_to_production(uuid, text),
  public.complete_production_order(uuid, numeric, numeric, jsonb, jsonb, text),
  public.cancel_production_order(uuid, text, jsonb),
  public.create_purchase_from_shortages(uuid, uuid)
  to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.user_org_ids(), private.user_admin_org_ids(), private.colleague_ids(),
  private.is_draft_purchase(uuid), private.is_active_production(uuid)
  to authenticated;
