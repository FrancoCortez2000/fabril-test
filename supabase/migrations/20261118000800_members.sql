-- FABRIL · Funciones administrativas para la gestión de usuarios (sólo servidor, con la clave secreta).
-- El servidor las llama DESPUÉS de verificar con la sesión del usuario que es admin de la fábrica.

create function public.admin_find_user_by_email(p_email text) returns uuid
language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u where lower(u.email) = lower(btrim(p_email)) limit 1
$$;

create function public.admin_list_member_accounts(p_org uuid)
returns table (user_id uuid, email text, last_sign_in_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.user_id, u.email::text, u.last_sign_in_at
  from public.memberships m
  join auth.users u on u.id = m.user_id
  where m.organization_id = p_org
  order by u.email
$$;

revoke execute on function public.admin_find_user_by_email(text), public.admin_list_member_accounts(uuid)
  from public, anon, authenticated;
grant execute on function public.admin_find_user_by_email(text), public.admin_list_member_accounts(uuid)
  to service_role;
