-- FABRIL · Proveedores y compras con recepción parcial, anulaciones y cierre con faltantes.

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  legal_name text,
  cuit text,
  contact_name text,
  email text,
  phone text,
  address text,
  city text,
  payment_terms text,
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (organization_id, id)
);
create index suppliers_org_idx on public.suppliers (organization_id);

alter table public.items
  add foreign key (organization_id, preferred_supplier_id) references public.suppliers (organization_id, id)
  on delete set null (preferred_supplier_id);
create index items_preferred_supplier_idx on public.items (preferred_supplier_id);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,
  supplier_id uuid not null,
  status text not null default 'draft' check (status in (
    'draft', 'pending', 'partially_received', 'received', 'closed', 'cancelled'
  )),
  order_date date not null default ((now() at time zone 'America/Argentina/Buenos_Aires')::date),
  expected_date date,
  notes text,
  subtotal numeric(14, 2) not null default 0,
  tax_total numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (organization_id, id),
  unique (organization_id, code),
  foreign key (organization_id, supplier_id) references public.suppliers (organization_id, id)
);
create index purchase_orders_org_status_idx on public.purchase_orders (organization_id, status);
create index purchase_orders_supplier_idx on public.purchase_orders (supplier_id);

create table public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  purchase_order_id uuid not null,
  item_id uuid not null,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_price numeric(14, 4) not null check (unit_price >= 0),
  tax_rate numeric(4, 1) not null default 21 check (tax_rate in (0, 10.5, 21, 27)),
  received_qty numeric(14, 3) not null default 0 check (received_qty >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, purchase_order_id) references public.purchase_orders (organization_id, id)
    on delete cascade,
  foreign key (organization_id, item_id) references public.items (organization_id, id)
);
create index purchase_order_lines_po_idx on public.purchase_order_lines (purchase_order_id);
create index purchase_order_lines_item_idx on public.purchase_order_lines (item_id);

create table public.purchase_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  purchase_order_id uuid not null,
  received_at date not null,
  delivery_note_number text,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (organization_id, id),
  foreign key (organization_id, purchase_order_id) references public.purchase_orders (organization_id, id)
    on delete cascade
);
create index purchase_receipts_po_idx on public.purchase_receipts (purchase_order_id);

create table public.purchase_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  receipt_id uuid not null,
  purchase_order_line_id uuid not null,
  quantity numeric(14, 3) not null check (quantity > 0),
  reversed_qty numeric(14, 3) not null default 0 check (reversed_qty >= 0 and reversed_qty <= quantity),
  created_at timestamptz not null default now(),
  foreign key (organization_id, receipt_id) references public.purchase_receipts (organization_id, id)
    on delete cascade,
  foreign key (organization_id, purchase_order_line_id) references public.purchase_order_lines (organization_id, id)
    on delete cascade
);
create index purchase_receipt_lines_receipt_idx on public.purchase_receipt_lines (receipt_id);
create index purchase_receipt_lines_po_line_idx on public.purchase_receipt_lines (purchase_order_line_id);

alter table public.stock_movements
  add foreign key (purchase_receipt_line_id) references public.purchase_receipt_lines (id) on delete cascade;
create index stock_movements_receipt_line_idx on public.stock_movements (purchase_receipt_line_id);

create trigger suppliers_updated_at before update on public.suppliers
  for each row execute function private.set_updated_at();
create trigger purchase_orders_updated_at before update on public.purchase_orders
  for each row execute function private.set_updated_at();
create trigger purchase_order_lines_updated_at before update on public.purchase_order_lines
  for each row execute function private.set_updated_at();

-- Código, validaciones y totales ------------------------------------------------------------

create function private.assign_purchase_code() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.code := private.next_document_code(new.organization_id, 'OC', coalesce(new.created_at, now()));
  return new;
end
$$;
create trigger purchase_orders_code before insert on public.purchase_orders
  for each row execute function private.assign_purchase_code();

create function private.validate_purchase_line() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select i.type from public.items i where i.id = new.item_id) is distinct from 'raw_material' then
    raise exception 'Sólo se compran materias primas' using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger purchase_order_lines_validate before insert or update of item_id on public.purchase_order_lines
  for each row execute function private.validate_purchase_line();

create function private.recalc_purchase_totals(p_po uuid) returns void
language sql security definer set search_path = '' as $$
  update public.purchase_orders po set
    subtotal = t.subtotal,
    tax_total = t.tax_total,
    total = t.subtotal + t.tax_total
  from (
    select
      coalesce(sum(round(l.quantity * l.unit_price, 2)), 0) as subtotal,
      coalesce(sum(round(l.quantity * l.unit_price * l.tax_rate / 100, 2)), 0) as tax_total
    from public.purchase_order_lines l
    where l.purchase_order_id = p_po
  ) t
  where po.id = p_po
$$;

create function private.purchase_lines_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform private.recalc_purchase_totals(old.purchase_order_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or new.purchase_order_id <> old.purchase_order_id) then
    perform private.recalc_purchase_totals(new.purchase_order_id);
  end if;
  return null;
end
$$;
create trigger purchase_order_lines_totals
  after insert or update of quantity, unit_price, tax_rate, purchase_order_id or delete
  on public.purchase_order_lines
  for each row execute function private.purchase_lines_changed();

-- Núcleos (actor y fecha explícitos: los reutiliza el generador de datos demo) --------------------

create function private.lock_purchase_order(p_id uuid) returns public.purchase_orders
language plpgsql security definer set search_path = '' as $$
declare
  v_po public.purchase_orders;
begin
  select * into v_po from public.purchase_orders where id = p_id for update;
  if not found then
    raise exception 'La orden de compra no existe' using errcode = 'P0001';
  end if;
  return v_po;
end
$$;

create function private.purchase_status_from_lines(p_po uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when bool_and(l.received_qty >= l.quantity) then 'received'
    when bool_or(l.received_qty > 0) then 'partially_received'
    else 'pending'
  end
  from public.purchase_order_lines l
  where l.purchase_order_id = p_po
$$;

create function private.confirm_purchase_order_core(p_id uuid, p_actor uuid, p_at timestamptz)
returns public.purchase_orders
language plpgsql security definer set search_path = '' as $$
declare
  v_po public.purchase_orders := private.lock_purchase_order(p_id);
begin
  if v_po.status <> 'draft' then
    raise exception 'La orden % ya no está en borrador', v_po.code using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.purchase_order_lines l where l.purchase_order_id = p_id) then
    raise exception 'Agregá al menos un material antes de confirmar' using errcode = 'P0001';
  end if;
  update public.purchase_orders set status = 'pending' where id = p_id returning * into v_po;
  perform private.log_activity(v_po.organization_id, p_actor, 'purchase_order', p_id, 'confirmed',
    'Confirmó la orden de compra ' || v_po.code, '{}'::jsonb, p_at);
  return v_po;
end
$$;

create function private.receive_purchase_order_core(
  p_id uuid,
  p_delivery_note text,
  p_received_at date,
  p_lines jsonb,
  p_actor uuid,
  p_at timestamptz
) returns public.purchase_receipts
language plpgsql security definer set search_path = '' as $$
declare
  v_po public.purchase_orders := private.lock_purchase_order(p_id);
  v_receipt public.purchase_receipts;
  v_entry jsonb;
  v_line record;
  v_qty numeric;
  v_rl_id uuid;
  v_date date := coalesce(p_received_at, private.org_today(v_po.organization_id, p_at));
begin
  if v_po.status not in ('pending', 'partially_received') then
    raise exception 'La orden % no está pendiente de recepción', v_po.code using errcode = 'P0001';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Indicá al menos una cantidad recibida' using errcode = 'P0001';
  end if;
  if v_date > private.org_today(v_po.organization_id, p_at) then
    raise exception 'La fecha de recepción no puede ser futura' using errcode = 'P0001';
  end if;

  insert into public.purchase_receipts (organization_id, purchase_order_id, received_at, delivery_note_number, created_at, created_by)
  values (v_po.organization_id, p_id, v_date, nullif(btrim(p_delivery_note), ''), p_at, p_actor)
  returning * into v_receipt;

  for v_entry in select * from jsonb_array_elements(p_lines) loop
    v_qty := round((v_entry ->> 'quantity')::numeric, 3);
    if v_qty is null or v_qty <= 0 then
      raise exception 'Las cantidades recibidas tienen que ser mayores a cero' using errcode = 'P0001';
    end if;
    select l.*, i.name as item_name, u.code as unit_code into v_line
      from public.purchase_order_lines l
      join public.items i on i.id = l.item_id
      join public.units u on u.id = i.unit_id
     where l.id = (v_entry ->> 'line_id')::uuid and l.purchase_order_id = p_id
     for update of l;
    if not found then
      raise exception 'La línea indicada no pertenece a la orden %', v_po.code using errcode = 'P0001';
    end if;
    if v_qty > v_line.quantity - v_line.received_qty then
      raise exception 'No podés recibir más de lo pedido: quedan % % de %',
        private.fmt_qty(v_line.quantity - v_line.received_qty), v_line.unit_code, v_line.item_name
        using errcode = 'P0001';
    end if;

    insert into public.purchase_receipt_lines (organization_id, receipt_id, purchase_order_line_id, quantity, created_at)
    values (v_po.organization_id, v_receipt.id, v_line.id, v_qty, p_at)
    returning id into v_rl_id;
    perform private.insert_movement(v_po.organization_id, v_line.item_id, 'purchase_receipt', v_qty,
      v_line.unit_price, 'Recepción ' || v_po.code, jsonb_build_object('purchase_receipt_line_id', v_rl_id),
      p_actor, p_at);
    update public.purchase_order_lines set received_qty = received_qty + v_qty where id = v_line.id;
    update public.items set last_purchase_cost = v_line.unit_price where id = v_line.item_id;
  end loop;

  update public.purchase_orders set status = private.purchase_status_from_lines(p_id) where id = p_id;
  perform private.log_activity(v_po.organization_id, p_actor, 'purchase_order', p_id, 'received',
    'Recibió mercadería de ' || v_po.code
      || coalesce(' (remito ' || nullif(btrim(p_delivery_note), '') || ')', ''),
    jsonb_build_object('receipt_id', v_receipt.id), p_at);
  return v_receipt;
end
$$;

create function private.reverse_purchase_receipt_core(
  p_receipt uuid,
  p_lines jsonb,
  p_reason text,
  p_actor uuid,
  p_at timestamptz
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_receipt public.purchase_receipts;
  v_po public.purchase_orders;
  v_entry jsonb;
  v_rl record;
  v_mov public.stock_movements;
  v_qty numeric;
  v_reason text := private.require_reason(p_reason, 'Indicá el motivo de la anulación');
begin
  select * into v_receipt from public.purchase_receipts where id = p_receipt;
  if not found then
    raise exception 'La recepción no existe' using errcode = 'P0001';
  end if;
  v_po := private.lock_purchase_order(v_receipt.purchase_order_id);
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Indicá al menos una cantidad a anular' using errcode = 'P0001';
  end if;

  for v_entry in select * from jsonb_array_elements(p_lines) loop
    v_qty := round((v_entry ->> 'quantity')::numeric, 3);
    if v_qty is null or v_qty <= 0 then
      raise exception 'Las cantidades a anular tienen que ser mayores a cero' using errcode = 'P0001';
    end if;
    select rl.*, l.item_id, i.name as item_name, u.code as unit_code into v_rl
      from public.purchase_receipt_lines rl
      join public.purchase_order_lines l on l.id = rl.purchase_order_line_id
      join public.items i on i.id = l.item_id
      join public.units u on u.id = i.unit_id
     where rl.id = (v_entry ->> 'receipt_line_id')::uuid and rl.receipt_id = p_receipt
     for update of rl;
    if not found then
      raise exception 'La línea indicada no pertenece a esta recepción' using errcode = 'P0001';
    end if;
    if v_qty > v_rl.quantity - v_rl.reversed_qty then
      raise exception 'No podés anular más de lo recibido en esta entrega: quedan % % de %',
        private.fmt_qty(v_rl.quantity - v_rl.reversed_qty), v_rl.unit_code, v_rl.item_name
        using errcode = 'P0001';
    end if;

    select * into v_mov from public.stock_movements
     where purchase_receipt_line_id = v_rl.id and movement_type = 'purchase_receipt';
    perform private.insert_movement(v_po.organization_id, v_rl.item_id, 'reversal', -v_qty, v_mov.unit_cost,
      v_reason, jsonb_build_object('reverses_movement_id', v_mov.id, 'purchase_receipt_line_id', v_rl.id),
      p_actor, p_at);
    update public.purchase_receipt_lines set reversed_qty = reversed_qty + v_qty where id = v_rl.id;
    update public.purchase_order_lines set received_qty = received_qty - v_qty where id = v_rl.purchase_order_line_id;
  end loop;

  if v_po.status not in ('closed', 'cancelled') then
    update public.purchase_orders set status = private.purchase_status_from_lines(v_po.id) where id = v_po.id;
  end if;
  perform private.log_activity(v_po.organization_id, p_actor, 'purchase_order', v_po.id, 'receipt_reversed',
    'Anuló mercadería recibida de ' || v_po.code || ' (' || v_reason || ')',
    jsonb_build_object('receipt_id', p_receipt), p_at);
end
$$;

create function private.cancel_purchase_order_core(p_id uuid, p_reason text, p_actor uuid, p_at timestamptz)
returns public.purchase_orders
language plpgsql security definer set search_path = '' as $$
declare
  v_po public.purchase_orders := private.lock_purchase_order(p_id);
  v_reason text := private.require_reason(p_reason, 'Indicá el motivo de la cancelación');
  v_new text;
begin
  if v_po.status in ('draft', 'pending')
     and not exists (select 1 from public.purchase_order_lines l where l.purchase_order_id = p_id and l.received_qty > 0) then
    v_new := 'cancelled';
  elsif v_po.status in ('pending', 'partially_received') then
    v_new := 'closed';
  else
    raise exception 'La orden % no se puede cancelar en su estado actual', v_po.code using errcode = 'P0001';
  end if;
  update public.purchase_orders set status = v_new, cancel_reason = v_reason where id = p_id returning * into v_po;
  perform private.log_activity(v_po.organization_id, p_actor, 'purchase_order', p_id, v_new,
    case when v_new = 'cancelled' then 'Canceló la orden de compra ' else 'Cerró con faltantes la orden de compra ' end
      || v_po.code || ' (' || v_reason || ')', '{}'::jsonb, p_at);
  return v_po;
end
$$;

-- RPC públicas -------------------------------------------------------------------------------

create function private.purchase_org(p_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select organization_id from public.purchase_orders where id = p_id
$$;

create function public.confirm_purchase_order(p_id uuid) returns public.purchase_orders
language plpgsql security definer set search_path = '' as $$
begin
  return private.confirm_purchase_order_core(p_id,
    private.require_role(private.purchase_org(p_id), '{admin}'), now());
end
$$;

create function public.receive_purchase_order(p_id uuid, p_delivery_note text, p_received_at date, p_lines jsonb)
returns public.purchase_receipts
language plpgsql security definer set search_path = '' as $$
begin
  return private.receive_purchase_order_core(p_id, p_delivery_note, p_received_at, p_lines,
    private.require_role(private.purchase_org(p_id), '{admin}'), now());
end
$$;

create function public.reverse_purchase_receipt(p_receipt uuid, p_lines jsonb, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := (select organization_id from public.purchase_receipts where id = p_receipt);
begin
  perform private.reverse_purchase_receipt_core(p_receipt, p_lines, p_reason,
    private.require_role(v_org, '{admin}'), now());
end
$$;

create function public.cancel_purchase_order(p_id uuid, p_reason text) returns public.purchase_orders
language plpgsql security definer set search_path = '' as $$
begin
  return private.cancel_purchase_order_core(p_id, p_reason,
    private.require_role(private.purchase_org(p_id), '{admin}'), now());
end
$$;

-- RLS y permisos -------------------------------------------------------------------------------

alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;
alter table public.purchase_receipts enable row level security;
alter table public.purchase_receipt_lines enable row level security;

revoke all on public.suppliers, public.purchase_orders, public.purchase_order_lines,
  public.purchase_receipts, public.purchase_receipt_lines from anon, authenticated;

grant select, insert, delete on public.suppliers to authenticated;
grant update (name, legal_name, cuit, contact_name, email, phone, address, city, payment_terms, notes, status)
  on public.suppliers to authenticated;
create policy suppliers_select on public.suppliers for select to authenticated
  using (organization_id in (select private.user_org_ids()));
create policy suppliers_insert on public.suppliers for insert to authenticated
  with check (organization_id in (select private.user_admin_org_ids()));
create policy suppliers_update on public.suppliers for update to authenticated
  using (organization_id in (select private.user_admin_org_ids()))
  with check (organization_id in (select private.user_admin_org_ids()));
create policy suppliers_delete on public.suppliers for delete to authenticated
  using (organization_id in (select private.user_admin_org_ids()));

grant select, delete on public.purchase_orders to authenticated;
grant insert (organization_id, supplier_id, order_date, expected_date, notes) on public.purchase_orders to authenticated;
grant update (supplier_id, order_date, expected_date, notes) on public.purchase_orders to authenticated;
create policy purchase_orders_select on public.purchase_orders for select to authenticated
  using (organization_id in (select private.user_org_ids()));
create policy purchase_orders_insert on public.purchase_orders for insert to authenticated
  with check (organization_id in (select private.user_admin_org_ids()) and status = 'draft');
create policy purchase_orders_update on public.purchase_orders for update to authenticated
  using (organization_id in (select private.user_admin_org_ids()) and status in ('draft', 'pending'))
  with check (organization_id in (select private.user_admin_org_ids()) and status in ('draft', 'pending'));
create policy purchase_orders_delete on public.purchase_orders for delete to authenticated
  using (organization_id in (select private.user_admin_org_ids()) and status = 'draft');

grant select, delete on public.purchase_order_lines to authenticated;
grant insert (organization_id, purchase_order_id, item_id, quantity, unit_price, tax_rate)
  on public.purchase_order_lines to authenticated;
grant update (item_id, quantity, unit_price, tax_rate) on public.purchase_order_lines to authenticated;

create function private.is_draft_purchase(p_po uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.purchase_orders po where po.id = p_po and po.status = 'draft')
$$;

create policy purchase_order_lines_select on public.purchase_order_lines for select to authenticated
  using (organization_id in (select private.user_org_ids()));
create policy purchase_order_lines_insert on public.purchase_order_lines for insert to authenticated
  with check (organization_id in (select private.user_admin_org_ids()) and private.is_draft_purchase(purchase_order_id));
create policy purchase_order_lines_update on public.purchase_order_lines for update to authenticated
  using (organization_id in (select private.user_admin_org_ids()) and private.is_draft_purchase(purchase_order_id))
  with check (organization_id in (select private.user_admin_org_ids()) and private.is_draft_purchase(purchase_order_id));
create policy purchase_order_lines_delete on public.purchase_order_lines for delete to authenticated
  using (organization_id in (select private.user_admin_org_ids()) and private.is_draft_purchase(purchase_order_id));

grant select on public.purchase_receipts, public.purchase_receipt_lines to authenticated;
create policy purchase_receipts_select on public.purchase_receipts for select to authenticated
  using (organization_id in (select private.user_org_ids()));
create policy purchase_receipt_lines_select on public.purchase_receipt_lines for select to authenticated
  using (organization_id in (select private.user_org_ids()));

revoke execute on function
  public.confirm_purchase_order(uuid),
  public.receive_purchase_order(uuid, text, date, jsonb),
  public.reverse_purchase_receipt(uuid, jsonb, text),
  public.cancel_purchase_order(uuid, text)
  from public, anon;
grant execute on function
  public.confirm_purchase_order(uuid),
  public.receive_purchase_order(uuid, text, date, jsonb),
  public.reverse_purchase_receipt(uuid, jsonb, text),
  public.cancel_purchase_order(uuid, text)
  to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.user_org_ids(), private.user_admin_org_ids(), private.colleague_ids(),
  private.is_draft_purchase(uuid)
  to authenticated;
