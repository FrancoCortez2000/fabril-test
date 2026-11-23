-- FABRIL · Demo pública: cualquiera puede LEER la fábrica demo marcada como pública, sin cuenta.
-- No hay ninguna política ni función de escritura para `anon`: la demo es de sólo lectura en la base.

alter table public.organizations add column is_public_demo boolean not null default false;
alter table public.organizations
  add constraint organizations_public_demo_is_demo check (not is_public_demo or is_demo);
-- Como máximo una demo pública.
create unique index organizations_one_public_demo on public.organizations ((true)) where is_public_demo;

-- Identifica la demo pública. `security definer` para poder leer la marca sin depender de los grants del llamador.
create function private.public_demo_org_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select o.id from public.organizations o where o.is_public_demo limit 1
$$;

grant usage on schema private to anon;

-- Sólo el proveedor del SaaS (clave secreta) elige cuál es la demo pública.
create function public.admin_set_public_demo(p_org uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce((select o.is_demo from public.organizations o where o.id = p_org), false) then
    raise exception 'Sólo una organización demo puede ser pública' using errcode = 'P0001';
  end if;
  update public.organizations set is_public_demo = false where is_public_demo and id <> p_org;
  update public.organizations set is_public_demo = true where id = p_org;
end
$$;

revoke execute on function public.admin_set_public_demo(uuid) from public, anon, authenticated;
grant execute on function public.admin_set_public_demo(uuid) to service_role;

-- Lectura de la organización pública: columnas básicas, nunca datos de contacto ni fiscales.
grant select (id, name, is_demo, is_public_demo, timezone) on public.organizations to anon;
create policy organizations_public_demo_select on public.organizations for select to anon, authenticated
  using (id = (select private.public_demo_org_id()));

-- Tablas de negocio: lectura de la demo pública para anon y para cualquier usuario autenticado.
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'items', 'boms', 'bom_lines', 'stock_movements', 'activity_log', 'suppliers',
    'purchase_orders', 'purchase_order_lines', 'purchase_receipts', 'purchase_receipt_lines',
    'areas', 'production_orders', 'production_order_materials', 'production_order_assignments',
    'production_reports', 'production_order_events'
  ] loop
    execute format('grant select on public.%I to anon', t);
    execute format(
      'create policy %1$s_public_demo_select on public.%1$s for select to anon, authenticated
         using (organization_id = (select private.public_demo_org_id()))', t);
  end loop;
end
$$;

-- Empleados: sin email, teléfono ni costo por hora.
grant select (id, organization_id, first_name, last_name, position, area_id, status)
  on public.employees to anon;
create policy employees_public_demo_select on public.employees for select to anon, authenticated
  using (organization_id = (select private.public_demo_org_id()));

-- Unidades de medida: catálogo global.
grant select on public.units to anon;
create policy units_anon_select on public.units for select to anon using (true);

-- Vistas (security_invoker): el filtro por fábrica lo ponen las tablas de origen.
grant select on public.item_stock_status, public.production_order_overview to anon;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.user_org_ids(), private.user_admin_org_ids(), private.colleague_ids(),
  private.is_draft_purchase(uuid), private.is_active_production(uuid), private.uuid_or_null(text)
  to authenticated;
grant execute on function private.public_demo_org_id() to anon, authenticated;
