-- FABRIL · Catálogo: unidades, categorías, ítems (productos y materias primas) y recetas.
-- Las referencias entre tablas de negocio usan claves compuestas (organization_id, id):
-- así la base impide que un registro apunte a otro de una fábrica distinta.

create table public.units (
  id smallint primary key,
  code text not null unique,
  name text not null,
  allows_decimals boolean not null default true
);

insert into public.units (id, code, name, allows_decimals) values
  (1, 'kg', 'Kilogramo', true),
  (2, 'g', 'Gramo', true),
  (3, 'u', 'Unidad', false),
  (4, 'l', 'Litro', true),
  (5, 'ml', 'Mililitro', true),
  (6, 'm', 'Metro', true),
  (7, 'm2', 'Metro cuadrado', true);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  applies_to text not null default 'both' check (applies_to in ('finished_good', 'raw_material', 'both')),
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (organization_id, id)
);
create unique index categories_org_name_key on public.categories (organization_id, lower(name));

create table public.items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  type text not null check (type in ('finished_good', 'raw_material')),
  sku text not null check (char_length(btrim(sku)) between 1 and 40),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  description text,
  category_id uuid,
  unit_id smallint not null references public.units (id),
  image_path text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  min_stock numeric(14, 3) not null default 0 check (min_stock >= 0),
  sale_price numeric(14, 2) check (sale_price >= 0),
  manual_cost numeric(14, 4) check (manual_cost >= 0),
  standard_labor_minutes numeric(8, 2) not null default 0 check (standard_labor_minutes >= 0),
  overhead_per_unit numeric(14, 4) not null default 0 check (overhead_per_unit >= 0),
  preferred_supplier_id uuid,
  last_purchase_cost numeric(14, 4),
  current_stock numeric(14, 3) not null default 0,
  avg_cost numeric(14, 4) not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (organization_id, id),
  foreign key (organization_id, category_id) references public.categories (organization_id, id)
    on delete set null (category_id)
);
create unique index items_org_sku_key on public.items (organization_id, upper(sku));
create index items_org_type_idx on public.items (organization_id, type) where archived_at is null;
create index items_category_idx on public.items (category_id);

create table public.boms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  item_id uuid not null unique,
  output_qty numeric(14, 3) not null default 1 check (output_qty > 0),
  default_waste_pct numeric(5, 2) check (default_waste_pct between 0 and 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (organization_id, id),
  foreign key (organization_id, item_id) references public.items (organization_id, id) on delete cascade
);

create table public.bom_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  bom_id uuid not null,
  component_item_id uuid not null,
  quantity numeric(14, 3) not null check (quantity > 0),
  waste_pct numeric(5, 2) check (waste_pct between 0 and 100),
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bom_id, component_item_id),
  foreign key (organization_id, bom_id) references public.boms (organization_id, id) on delete cascade,
  foreign key (organization_id, component_item_id) references public.items (organization_id, id)
);
create index bom_lines_component_idx on public.bom_lines (component_item_id);

create trigger categories_updated_at before update on public.categories
  for each row execute function private.set_updated_at();
create trigger items_updated_at before update on public.items
  for each row execute function private.set_updated_at();
create trigger boms_updated_at before update on public.boms
  for each row execute function private.set_updated_at();
create trigger bom_lines_updated_at before update on public.bom_lines
  for each row execute function private.set_updated_at();

-- Validaciones de recetas ---------------------------------------------------------

create function private.validate_bom() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select i.type from public.items i where i.id = new.item_id) is distinct from 'finished_good' then
    raise exception 'La receta tiene que ser de un producto terminado' using errcode = 'P0001';
  end if;
  return new;
end
$$;

create function private.validate_bom_line() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select i.type from public.items i where i.id = new.component_item_id) is distinct from 'raw_material' then
    raise exception 'El componente tiene que ser una materia prima' using errcode = 'P0001';
  end if;
  return new;
end
$$;

create trigger boms_validate before insert or update of item_id on public.boms
  for each row execute function private.validate_bom();
create trigger bom_lines_validate before insert or update of component_item_id on public.bom_lines
  for each row execute function private.validate_bom_line();

-- Un ítem con receta o usado en recetas no puede cambiar de tipo (el tipo no es editable por grants).

-- Regla de cálculo de materiales (misma que src/features/production/logic.ts) ------------------

create function private.bom_requirement(
  p_planned_qty numeric,
  p_qty_per_output numeric,
  p_output_qty numeric,
  p_waste_pct numeric
) returns numeric
language sql immutable set search_path = '' as $$
  select round(p_planned_qty * p_qty_per_output / p_output_qty * (1 + coalesce(p_waste_pct, 0) / 100), 3)
$$;

-- Actividad de ítems --------------------------------------------------------------------

create function private.item_type_label(p_type text) returns text
language sql immutable set search_path = '' as $$
  select case p_type when 'finished_good' then 'el producto' else 'la materia prima' end
$$;

create function private.log_item_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- El generador de datos demo registra su propia historia.
  if coalesce(current_setting('fabril.seeding', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    perform private.log_activity(new.organization_id, coalesce(auth.uid(), new.created_by), 'item', new.id,
      'created', 'Creó ' || private.item_type_label(new.type) || ' ' || new.name);
  elsif old.archived_at is null and new.archived_at is not null then
    perform private.log_activity(new.organization_id, auth.uid(), 'item', new.id,
      'archived', 'Archivó ' || private.item_type_label(new.type) || ' ' || new.name);
  elsif old.archived_at is not null and new.archived_at is null then
    perform private.log_activity(new.organization_id, auth.uid(), 'item', new.id,
      'restored', 'Restauró ' || private.item_type_label(new.type) || ' ' || new.name);
  end if;
  return new;
end
$$;

create trigger items_activity after insert or update of archived_at on public.items
  for each row execute function private.log_item_activity();

-- RLS y permisos -------------------------------------------------------------------------

alter table public.units enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.boms enable row level security;
alter table public.bom_lines enable row level security;

revoke all on public.units, public.categories, public.items, public.boms, public.bom_lines
  from anon, authenticated;

grant select on public.units to authenticated;
create policy units_select on public.units for select to authenticated using (true);

grant select, insert, delete on public.categories to authenticated;
grant update (name, applies_to, color) on public.categories to authenticated;

grant select, delete on public.items to authenticated;
-- Insert por columna: stock, costos y autor sólo los escriben los triggers y los defaults.
grant insert (organization_id, type, sku, name, description, category_id, unit_id, image_path, status, min_stock,
  sale_price, manual_cost, standard_labor_minutes, overhead_per_unit, preferred_supplier_id)
  on public.items to authenticated;
grant update (sku, name, description, category_id, unit_id, image_path, status, min_stock, sale_price,
  manual_cost, standard_labor_minutes, overhead_per_unit, preferred_supplier_id, archived_at)
  on public.items to authenticated;

grant select, insert, delete on public.boms to authenticated;
grant update (output_qty, default_waste_pct, notes) on public.boms to authenticated;

grant select, insert, delete on public.bom_lines to authenticated;
grant update (quantity, waste_pct, position) on public.bom_lines to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['categories', 'items', 'boms', 'bom_lines'] loop
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
end
$$;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.user_org_ids(), private.user_admin_org_ids(), private.colleague_ids()
  to authenticated;
