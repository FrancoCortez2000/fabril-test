-- FABRIL · Núcleo: organizaciones, perfiles, membresías, permisos, numeración y actividad.

-- Esquema privado: helpers de RLS y núcleos de negocio. No se expone por la API.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;
-- (Postgres concede EXECUTE a PUBLIC en toda función nueva: cada migración lo revoca al final.)

create type public.app_role as enum ('admin');
create type public.membership_status as enum ('active', 'disabled');

-- Helpers genéricos ----------------------------------------------------------

create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- Purga interna (sólo la usa reset_demo_organization para borrar en cascada).
create function private.purging() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(current_setting('fabril.purge', true), '') = 'on'
$$;

create function private.reject_changes() returns trigger
language plpgsql set search_path = '' as $$
begin
  if private.purging() then
    return coalesce(new, old);
  end if;
  raise exception '%', coalesce(tg_argv[0], 'Este registro no se puede modificar') using errcode = 'P0001';
end
$$;

-- Tablas ----------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  legal_name text,
  cuit text,
  address text,
  city text,
  province text,
  phone text,
  email text,
  logo_path text,
  is_demo boolean not null default false,
  default_waste_pct numeric(5, 2) not null default 3 check (default_waste_pct between 0 and 100),
  default_labor_rate numeric(14, 2) not null default 0 check (default_labor_rate >= 0),
  allow_negative_stock boolean not null default false,
  timezone text not null default 'America/Argentina/Buenos_Aires',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  avatar_path text,
  last_organization_id uuid references public.organizations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null default 'admin',
  status public.membership_status not null default 'active',
  invited_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index memberships_user_id_idx on public.memberships (user_id);

create table public.document_sequences (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  doc_type text not null check (doc_type in ('OP', 'OC', 'AJ')),
  year int not null,
  last_value int not null default 0,
  primary key (organization_id, doc_type, year)
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_id uuid,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index activity_log_org_occurred_idx on public.activity_log (organization_id, occurred_at desc);
create index activity_log_entity_idx on public.activity_log (entity_id);

create trigger organizations_updated_at before update on public.organizations
  for each row execute function private.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger memberships_updated_at before update on public.memberships
  for each row execute function private.set_updated_at();
create trigger activity_log_immutable before update or delete on public.activity_log
  for each row execute function private.reject_changes('El historial de actividad no se modifica');

-- Helpers de permisos -----------------------------------------------------------

create function private.user_org_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.organization_id
  from public.memberships m
  where m.user_id = (select auth.uid()) and m.status = 'active'
$$;

create function private.user_admin_org_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.organization_id
  from public.memberships m
  where m.user_id = (select auth.uid()) and m.status = 'active' and m.role = 'admin'
$$;

-- Usuarios que comparten alguna fábrica activa con el usuario actual (incluido él mismo).
create function private.colleague_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select distinct m.user_id
  from public.memberships m
  where m.organization_id in (
    select mm.organization_id from public.memberships mm
    where mm.user_id = (select auth.uid()) and mm.status = 'active'
  )
$$;

create function private.has_role(p_org uuid, p_roles public.app_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = p_org
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = any (p_roles)
  )
$$;

create function private.require_role(p_org uuid, p_roles public.app_role[]) returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_org is null or not private.has_role(p_org, p_roles) then
    raise exception 'No tenés permiso para hacer esto en esta fábrica' using errcode = '42501';
  end if;
  return (select auth.uid());
end
$$;

grant execute on function private.user_org_ids(), private.user_admin_org_ids(), private.colleague_ids()
  to authenticated;

-- Último administrador ------------------------------------------------------------

create function private.guard_last_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if private.purging() then
    return coalesce(new, old);
  end if;
  if old.role = 'admin' and old.status = 'active' and (
    tg_op = 'DELETE'
    or new.role <> 'admin'
    or new.status <> 'active'
    or new.organization_id <> old.organization_id
  ) then
    -- Serializa cambios concurrentes de membresías de la misma fábrica.
    perform 1 from public.organizations o where o.id = old.organization_id for update;
    if not exists (
      select 1 from public.memberships m
      where m.organization_id = old.organization_id
        and m.id <> old.id
        and m.role = 'admin'
        and m.status = 'active'
    ) then
      raise exception 'La fábrica tiene que tener al menos un administrador activo' using errcode = 'P0001';
    end if;
  end if;
  return coalesce(new, old);
end
$$;

create trigger memberships_guard_last_admin before update or delete on public.memberships
  for each row execute function private.guard_last_admin();

-- Perfiles automáticos ---------------------------------------------------------------

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Usuario'
    )
  )
  on conflict (id) do nothing;
  return new;
end
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Numeración y actividad --------------------------------------------------------------

create function private.org_today(p_org uuid, p_at timestamptz default now()) returns date
language sql stable security definer set search_path = '' as $$
  select (p_at at time zone coalesce(
    (select o.timezone from public.organizations o where o.id = p_org),
    'America/Argentina/Buenos_Aires'
  ))::date
$$;

create function private.next_document_code(p_org uuid, p_doc_type text, p_at timestamptz)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_year int := extract(year from private.org_today(p_org, p_at))::int;
  v_value int;
begin
  insert into public.document_sequences as s (organization_id, doc_type, year, last_value)
  values (p_org, p_doc_type, v_year, 1)
  on conflict (organization_id, doc_type, year) do update set last_value = s.last_value + 1
  returning s.last_value into v_value;
  return p_doc_type || '-' || v_year || '-' || lpad(v_value::text, 4, '0');
end
$$;

create function private.log_activity(
  p_org uuid,
  p_actor uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_summary text,
  p_metadata jsonb default '{}'::jsonb,
  p_at timestamptz default now()
) returns void
language sql security definer set search_path = '' as $$
  insert into public.activity_log (organization_id, actor_id, entity_type, entity_id, action, summary, metadata, occurred_at)
  values (p_org, p_actor, p_entity_type, p_entity_id, p_action, p_summary, coalesce(p_metadata, '{}'::jsonb), p_at)
$$;

-- Alta de fábrica (sólo servidor / scripts con la clave secreta) ----------------------------

create function public.admin_create_organization(p_name text, p_admin_user uuid, p_is_demo boolean default false)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
begin
  if not exists (select 1 from public.profiles p where p.id = p_admin_user) then
    raise exception 'El usuario administrador no existe' using errcode = 'P0001';
  end if;
  insert into public.organizations (name, is_demo) values (btrim(p_name), coalesce(p_is_demo, false))
  returning id into v_org;
  insert into public.memberships (organization_id, user_id, role, status)
  values (v_org, p_admin_user, 'admin', 'active');
  update public.profiles set last_organization_id = v_org
  where id = p_admin_user and last_organization_id is null;
  perform private.log_activity(v_org, p_admin_user, 'organization', v_org, 'created', 'Creó la fábrica ' || btrim(p_name));
  return v_org;
end
$$;

revoke execute on function public.admin_create_organization(text, uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_create_organization(text, uuid, boolean) to service_role;

-- RLS y permisos ---------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.document_sequences enable row level security;
alter table public.activity_log enable row level security;

revoke all on public.organizations, public.profiles, public.memberships, public.document_sequences,
  public.activity_log from anon, authenticated;

grant select on public.organizations to authenticated;
grant update (name, legal_name, cuit, address, city, province, phone, email, logo_path,
  default_waste_pct, default_labor_rate, allow_negative_stock, timezone)
  on public.organizations to authenticated;

create policy organizations_select on public.organizations for select to authenticated
  using (id in (select private.user_org_ids()));
create policy organizations_update on public.organizations for update to authenticated
  using (id in (select private.user_admin_org_ids()))
  with check (id in (select private.user_admin_org_ids()));

grant select on public.profiles to authenticated;
grant update (full_name, avatar_path, last_organization_id) on public.profiles to authenticated;

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or id in (select private.colleague_ids()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

grant select on public.memberships to authenticated;
grant update (role, status) on public.memberships to authenticated;

create policy memberships_select on public.memberships for select to authenticated
  using (user_id = (select auth.uid()) or organization_id in (select private.user_org_ids()));
create policy memberships_update on public.memberships for update to authenticated
  using (organization_id in (select private.user_admin_org_ids()))
  with check (organization_id in (select private.user_admin_org_ids()));

grant select on public.activity_log to authenticated;
create policy activity_log_select on public.activity_log for select to authenticated
  using (organization_id in (select private.user_org_ids()));

-- Ninguna función privada es ejecutable por los roles de la API salvo los helpers de RLS.
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.user_org_ids(), private.user_admin_org_ids(), private.colleague_ids()
  to authenticated;
