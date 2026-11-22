-- FABRIL · Archivos privados por fábrica y solicitudes de demostración de la landing.

-- Storage ------------------------------------------------------------------------------------
-- Rutas: {organization_id}/{uuid}.webp. Se muestran con URLs firmadas (buckets privados).

create function private.uuid_or_null(p_value text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return p_value::uuid;
exception when others then
  return null;
end
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('item-images', 'item-images', false, 2097152, array['image/webp', 'image/png', 'image/jpeg']),
  ('employee-photos', 'employee-photos', false, 2097152, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy fabril_objects_select on storage.objects for select to authenticated
  using (
    bucket_id in ('item-images', 'employee-photos')
    and private.uuid_or_null((storage.foldername(name))[1]) in (select private.user_org_ids())
  );
create policy fabril_objects_insert on storage.objects for insert to authenticated
  with check (
    bucket_id in ('item-images', 'employee-photos')
    and private.uuid_or_null((storage.foldername(name))[1]) in (select private.user_admin_org_ids())
  );
create policy fabril_objects_update on storage.objects for update to authenticated
  using (
    bucket_id in ('item-images', 'employee-photos')
    and private.uuid_or_null((storage.foldername(name))[1]) in (select private.user_admin_org_ids())
  )
  with check (
    bucket_id in ('item-images', 'employee-photos')
    and private.uuid_or_null((storage.foldername(name))[1]) in (select private.user_admin_org_ids())
  );
create policy fabril_objects_delete on storage.objects for delete to authenticated
  using (
    bucket_id in ('item-images', 'employee-photos')
    and private.uuid_or_null((storage.foldername(name))[1]) in (select private.user_admin_org_ids())
  );

-- Solicitudes de demostración ----------------------------------------------------------------------
-- Nadie accede desde el navegador: la Server Action valida y llama a submit_demo_request con la clave secreta.

create table public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  company text not null check (char_length(company) between 2 and 120),
  email text not null check (char_length(email) between 3 and 254 and position('@' in email) > 1),
  phone text check (phone is null or char_length(phone) <= 30),
  industry text check (industry is null or char_length(industry) <= 80),
  message text check (message is null or char_length(message) <= 1000),
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index demo_requests_ip_created_idx on public.demo_requests (ip_hash, created_at desc);
create index demo_requests_created_idx on public.demo_requests (created_at desc);

alter table public.demo_requests enable row level security;
revoke all on public.demo_requests from anon, authenticated;

create function public.submit_demo_request(
  p_name text, p_company text, p_email text, p_phone text, p_industry text, p_message text, p_ip_hash text
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  -- Serializa los envíos para que el límite no se pueda saltar con pedidos simultáneos.
  perform pg_advisory_xact_lock(hashtext('fabril.demo_requests'));
  if (select count(*) from public.demo_requests r
      where r.ip_hash = p_ip_hash and r.created_at > now() - interval '1 hour') >= 3
     or (select count(*) from public.demo_requests r where r.created_at > now() - interval '1 hour') >= 50 then
    raise exception 'Recibimos varias solicitudes desde tu conexión. Probá de nuevo en un rato.' using errcode = 'P0001';
  end if;
  insert into public.demo_requests (name, company, email, phone, industry, message, ip_hash)
  values (btrim(p_name), btrim(p_company), lower(btrim(p_email)), nullif(btrim(p_phone), ''),
    nullif(btrim(p_industry), ''), nullif(btrim(p_message), ''), p_ip_hash);
end
$$;

revoke execute on function public.submit_demo_request(text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_demo_request(text, text, text, text, text, text, text) to service_role;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.user_org_ids(), private.user_admin_org_ids(), private.colleague_ids(),
  private.is_draft_purchase(uuid), private.is_active_production(uuid), private.uuid_or_null(text)
  to authenticated;
