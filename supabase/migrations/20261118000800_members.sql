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

-- ¿Puede esta fábrica entregar un enlace de ingreso para este usuario? Sólo si lo invitó esta fábrica,
-- no pertenece a ninguna otra y nunca ingresó. Así un admin no puede tomar la cuenta de alguien
-- de otra fábrica (por ejemplo, un dueño que todavía no activó su invitación).
create function public.admin_can_share_login_link(p_org uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select
    exists (select 1 from auth.users u where u.id = p_user and u.last_sign_in_at is null)
    and exists (select 1 from public.memberships m
                where m.organization_id = p_org and m.user_id = p_user and m.invited_by is not null)
    and not exists (select 1 from public.memberships m
                    where m.user_id = p_user and m.organization_id <> p_org)
$$;

revoke execute on function public.admin_can_share_login_link(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_can_share_login_link(uuid, uuid) to service_role;
