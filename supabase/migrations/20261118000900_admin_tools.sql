-- FABRIL · Herramientas administrativas del proveedor del SaaS (sólo con la clave secreta).

-- Borra una fábrica con toda su historia. Exige el nombre exacto como confirmación.
-- Lo usa el script de verificación de aislamiento para limpiar sus fábricas temporales.
create function public.admin_delete_organization(p_org uuid, p_confirm_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_confirm_name is distinct from (select o.name from public.organizations o where o.id = p_org) then
    raise exception 'El nombre no coincide: no se borró la fábrica' using errcode = 'P0001';
  end if;
  perform 1 from public.organizations where id = p_org for update;
  perform private.purge_organization_data(p_org);
  perform set_config('fabril.purge', 'on', true);
  delete from public.memberships where organization_id = p_org;
  update public.profiles set last_organization_id = null where last_organization_id = p_org;
  delete from public.organizations where id = p_org;
  perform set_config('fabril.purge', 'off', true);
end
$$;

revoke execute on function public.admin_delete_organization(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_delete_organization(uuid, text) to service_role;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.user_org_ids(), private.user_admin_org_ids(), private.colleague_ids(),
  private.is_draft_purchase(uuid), private.is_active_production(uuid), private.uuid_or_null(text)
  to authenticated;
