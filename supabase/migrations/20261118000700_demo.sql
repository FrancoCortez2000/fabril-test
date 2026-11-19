-- FABRIL · Organización demo "Plásticos del Litoral S.A." (ficticia).
-- La historia se genera simulando 180 días con los MISMOS núcleos de negocio que usa la operación real
-- (crear/iniciar/completar producción, comprar/recibir, ajustes), en orden cronológico estricto.
-- Determinística: semilla fija y recorridos siempre ordenados por claves estables (nunca por uuid).

-- Pseudoazar determinístico por clave: no depende del orden en que Postgres recorre las filas.
create function private.demo_rand(p_key text) returns numeric
language sql immutable set search_path = '' as $q$
  select ((hashtext(p_key)::bigint + 2147483648) % 1000000)::numeric / 1000000
$q$;

create function private.demo_at(p_day date, p_tick int, p_tz text) returns timestamptz
language sql stable set search_path = '' as $$
  select ((p_day + time '07:00') + make_interval(mins => p_tick)) at time zone p_tz
$$;

create function private.demo_round_qty(p_qty numeric, p_unit text) returns numeric
language sql immutable set search_path = '' as $$
  select case when p_unit = 'u' then ceil(p_qty / 500) * 500 else ceil(p_qty / 25) * 25 end
$$;

create function private.demo_new_po(
  p_org uuid, p_supplier uuid, p_lines jsonb, p_note text, p_actor uuid, p_at timestamptz
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_po public.purchase_orders;
  v_today date := private.org_today(p_org, p_at);
begin
  insert into public.purchase_orders (organization_id, supplier_id, order_date, expected_date, notes, created_at, created_by)
  values (p_org, p_supplier, v_today, v_today + 7, p_note, p_at, p_actor)
  returning * into v_po;
  insert into public.purchase_order_lines (organization_id, purchase_order_id, item_id, quantity, unit_price, tax_rate, created_at)
  select p_org, v_po.id, (e ->> 'item_id')::uuid, (e ->> 'quantity')::numeric, (e ->> 'unit_price')::numeric, 21, p_at
  from jsonb_array_elements(p_lines) e;
  perform private.log_activity(p_org, p_actor, 'purchase_order', v_po.id, 'created',
    'Creó la orden de compra ' || v_po.code, '{}'::jsonb, p_at);
  return v_po.id;
end
$$;

create function private.demo_receive(p_po uuid, p_fraction numeric, p_actor uuid, p_at timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := (select organization_id from public.purchase_orders where id = p_po);
  v_lines jsonb;
  v_note text;
begin
  select jsonb_agg(jsonb_build_object('line_id', x.id, 'quantity', x.qty) order by x.sku)
    into v_lines
    from (
      select l.id, i.sku,
        case when p_fraction >= 1 then l.quantity - l.received_qty
             else round((l.quantity - l.received_qty) * p_fraction, case when u.allows_decimals then 3 else 0 end)
        end as qty
      from public.purchase_order_lines l
      join public.items i on i.id = l.item_id
      join public.units u on u.id = i.unit_id
      where l.purchase_order_id = p_po and l.received_qty < l.quantity
    ) x
   where x.qty > 0;
  if v_lines is null then
    return;
  end if;
  v_note := '0001-' || lpad(((select count(*) from public.purchase_receipts r where r.organization_id = v_org) + 4521)::text, 8, '0');
  perform private.receive_purchase_order_core(p_po, v_note, null, v_lines, p_actor, p_at);
end
$$;

create function private.seed_demo(p_org uuid, p_actor uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_tz text;
  v_today date;
  v_days constant int := 180;
  v_start date;
  v_day date;
  v_d int;
  v_tick int;
  v_at timestamptz;
  v_k int;
  v_skus text[] := array['BID-5L-AZ', 'BID-20L-BL', 'BOT-500', 'BOT-1L', 'BAL-10L', 'BAL-20L',
                         'TAPA-28', 'TAPA-38', 'ENV-250', 'ENV-1K', 'CAJ-ORG-CH', 'CAJ-ORG-GR'];
  v_raw_skus text[];
  r record;
  m record;
  v_id uuid;
  v_po uuid;
  v_bom uuid;
  v_order public.production_orders;
  v_qty numeric;
  v_good numeric;
  v_def numeric;
  v_n numeric;
  v_remaining numeric;
  v_daily numeric;
  v_lines jsonb;
  v_cons jsonb;
  v_hours jsonb;
  v_lead int;
  v_resp uuid;
  v_ops uuid[];
  v_missing_suppliers int;
  v_sup uuid;
  v_low int;
begin
  perform set_config('fabril.seeding', 'on', true);
  perform setseed(0.42);
  select timezone into v_tz from public.organizations where id = p_org;
  v_today := private.org_today(p_org);
  v_start := v_today - v_days;
  v_at := private.demo_at(v_start, 0, v_tz);

  drop table if exists pg_temp.demo_sup, pg_temp.demo_raw, pg_temp.demo_prod, pg_temp.demo_recipe,
    pg_temp.demo_plan, pg_temp.demo_delivery, pg_temp.demo_usage;

  -- Catálogo --------------------------------------------------------------------------------
  create temp table demo_sup (key text primary key, name text, cuit text, contact text, email text, phone text,
    city text, terms text, id uuid) on commit drop;
  insert into pg_temp.demo_sup (key, name, cuit, contact, email, phone, city, terms) values
    ('a-sur', 'Petroquímica del Sur S.A.', '30-70981234-5', 'Mariana Quiroga', 'ventas@petrosur.example', '0341 455-1200', 'Rosario', '30 días'),
    ('b-pol', 'Polímeros Rosario S.R.L.', '30-71122334-8', 'Esteban Ledesma', 'pedidos@polimerosrosario.example', '0341 437-8890', 'Rosario', '15 días'),
    ('c-col', 'Colorantes Andinos S.A.', '30-69874512-3', 'Valeria Funes', 'comercial@colorantesandinos.example', '0261 429-3300', 'Mendoza', 'Contado'),
    ('d-etq', 'Etiquetas del Litoral', '20-28456712-9', 'Gabriel Ortiz', 'gabriel@etiquetaslitoral.example', '0342 456-7781', 'Santa Fe', '30 días'),
    ('e-emb', 'Embalajes Paraná S.A.', '30-70456123-1', 'Silvina Ruiz', 'ventas@embalajesparana.example', '0343 431-2290', 'Paraná', '30 días');
  for r in select * from pg_temp.demo_sup order by key loop
    insert into public.suppliers (organization_id, name, legal_name, cuit, contact_name, email, phone, city, payment_terms, created_at, created_by)
    values (p_org, r.name, r.name, r.cuit, r.contact, r.email, r.phone, r.city, r.terms, v_at, p_actor)
    returning id into v_id;
    update pg_temp.demo_sup set id = v_id where key = r.key;
  end loop;

  insert into public.categories (organization_id, name, applies_to, color, created_at, created_by) values
    (p_org, 'Envases soplados', 'finished_good', '#2a6db5', v_at, p_actor),
    (p_org, 'Inyección', 'finished_good', '#b45f3c', v_at, p_actor),
    (p_org, 'Resinas', 'raw_material', '#64748b', v_at, p_actor),
    (p_org, 'Pigmentos', 'raw_material', '#7c3aed', v_at, p_actor),
    (p_org, 'Insumos y empaque', 'raw_material', '#15803d', v_at, p_actor);

  create temp table demo_raw (sku text primary key, name text, unit text, cost numeric, supplier text, category text,
    item_id uuid) on commit drop;
  insert into pg_temp.demo_raw (sku, name, unit, cost, supplier, category) values
    ('PEAD-SOP', 'Polietileno de alta densidad (soplado)', 'kg', 1850, 'a-sur', 'Resinas'),
    ('PEBD', 'Polietileno de baja densidad', 'kg', 1950, 'a-sur', 'Resinas'),
    ('PET', 'PET grado botella', 'kg', 2100, 'a-sur', 'Resinas'),
    ('PP-HOMO', 'Polipropileno homopolímero', 'kg', 1700, 'b-pol', 'Resinas'),
    ('PP-COPO', 'Polipropileno copolímero', 'kg', 1900, 'b-pol', 'Resinas'),
    ('MB-AZUL', 'Masterbatch azul', 'kg', 9800, 'c-col', 'Pigmentos'),
    ('MB-BLAN', 'Masterbatch blanco', 'kg', 8600, 'c-col', 'Pigmentos'),
    ('MB-ROJO', 'Masterbatch rojo', 'kg', 10200, 'c-col', 'Pigmentos'),
    ('MB-NEGR', 'Masterbatch negro', 'kg', 7900, 'c-col', 'Pigmentos'),
    ('ETQ', 'Etiqueta autoadhesiva', 'u', 38, 'd-etq', 'Insumos y empaque'),
    ('PREC', 'Precinto de seguridad', 'u', 12, 'd-etq', 'Insumos y empaque'),
    ('ASA-MET', 'Asa metálica para balde', 'u', 145, 'e-emb', 'Insumos y empaque'),
    ('CAJA', 'Caja de cartón corrugado', 'u', 620, 'e-emb', 'Insumos y empaque'),
    ('FILM', 'Film stretch', 'kg', 3200, 'e-emb', 'Insumos y empaque');
  for r in select dr.*, s.id as supplier_id from pg_temp.demo_raw dr join pg_temp.demo_sup s on s.key = dr.supplier order by dr.sku loop
    insert into public.items (organization_id, type, sku, name, category_id, unit_id, preferred_supplier_id, created_at, created_by)
    values (p_org, 'raw_material', r.sku, r.name,
      (select c.id from public.categories c where c.organization_id = p_org and c.name = r.category),
      (select u.id from public.units u where u.code = r.unit), r.supplier_id, v_at, p_actor)
    returning id into v_id;
    update pg_temp.demo_raw set item_id = v_id where sku = r.sku;
  end loop;
  select array_agg(sku order by sku) into v_raw_skus from pg_temp.demo_raw;

  create temp table demo_prod (sku text primary key, name text, minutes numeric, overhead numeric, price numeric,
    output numeric, qmin numeric, qmax numeric, step numeric, area text, category text, item_id uuid) on commit drop;
  insert into pg_temp.demo_prod (sku, name, minutes, overhead, price, output, qmin, qmax, step, area, category) values
    ('BID-5L-AZ', 'Bidón 5 L azul', 0.6, 35, 2900, 1, 1000, 3000, 100, 'Soplado', 'Envases soplados'),
    ('BID-20L-BL', 'Bidón 20 L blanco', 1.5, 90, 9800, 1, 300, 800, 50, 'Soplado', 'Envases soplados'),
    ('BOT-500', 'Botella PET 500 ml', 0.05, 4, 260, 1, 5000, 15000, 500, 'Soplado', 'Envases soplados'),
    ('BOT-1L', 'Botella PET 1 L', 0.07, 6, 390, 1, 4000, 10000, 500, 'Soplado', 'Envases soplados'),
    ('BAL-10L', 'Balde 10 L rojo', 0.8, 45, 4200, 1, 500, 1500, 100, 'Inyección', 'Inyección'),
    ('BAL-20L', 'Balde 20 L negro', 1.1, 70, 6900, 1, 300, 900, 50, 'Inyección', 'Inyección'),
    ('TAPA-28', 'Tapa rosca 28 mm', 0.01, 1, 45, 1000, 10000, 30000, 1000, 'Inyección', 'Inyección'),
    ('TAPA-38', 'Tapa rosca 38 mm', 0.012, 1.5, 70, 1000, 8000, 20000, 1000, 'Inyección', 'Inyección'),
    ('ENV-250', 'Envase 250 g', 0.04, 3, 210, 1, 2000, 6000, 500, 'Inyección', 'Inyección'),
    ('ENV-1K', 'Envase 1 kg', 0.06, 5, 480, 1, 1500, 4000, 500, 'Inyección', 'Inyección'),
    ('CAJ-ORG-CH', 'Caja organizadora chica', 0.7, 40, 5200, 1, 200, 600, 50, 'Inyección', 'Inyección'),
    ('CAJ-ORG-GR', 'Caja organizadora grande', 1.4, 85, 11800, 1, 150, 400, 50, 'Inyección', 'Inyección');

  create temp table demo_recipe (product text, raw text, qty numeric, primary key (product, raw)) on commit drop;
  insert into pg_temp.demo_recipe (product, raw, qty) values
    ('BID-5L-AZ', 'PEAD-SOP', 0.2), ('BID-5L-AZ', 'PEBD', 0.02), ('BID-5L-AZ', 'MB-AZUL', 0.004),
    ('BID-5L-AZ', 'ETQ', 1), ('BID-5L-AZ', 'PREC', 1),
    ('BID-20L-BL', 'PEAD-SOP', 0.92), ('BID-20L-BL', 'MB-BLAN', 0.015), ('BID-20L-BL', 'ETQ', 1),
    ('BID-20L-BL', 'PREC', 1), ('BID-20L-BL', 'FILM', 0.01),
    ('BOT-500', 'PET', 0.024), ('BOT-500', 'ETQ', 1),
    ('BOT-1L', 'PET', 0.038), ('BOT-1L', 'ETQ', 1), ('BOT-1L', 'CAJA', 0.01),
    ('BAL-10L', 'PP-COPO', 0.42), ('BAL-10L', 'MB-ROJO', 0.006), ('BAL-10L', 'ASA-MET', 1),
    ('BAL-20L', 'PP-COPO', 0.78), ('BAL-20L', 'MB-NEGR', 0.01), ('BAL-20L', 'ASA-MET', 1), ('BAL-20L', 'FILM', 0.005),
    ('TAPA-28', 'PP-HOMO', 2.5), ('TAPA-28', 'MB-BLAN', 0.05),
    ('TAPA-38', 'PP-HOMO', 4.2), ('TAPA-38', 'MB-AZUL', 0.08),
    ('ENV-250', 'PP-HOMO', 0.018), ('ENV-250', 'PEBD', 0.002), ('ENV-250', 'ETQ', 1), ('ENV-250', 'CAJA', 0.01),
    ('ENV-1K', 'PP-HOMO', 0.052), ('ENV-1K', 'ETQ', 1), ('ENV-1K', 'CAJA', 0.02),
    ('CAJ-ORG-CH', 'PP-COPO', 0.35), ('CAJ-ORG-CH', 'MB-AZUL', 0.004),
    ('CAJ-ORG-GR', 'PP-COPO', 0.9), ('CAJ-ORG-GR', 'MB-AZUL', 0.01), ('CAJ-ORG-GR', 'CAJA', 0.02);

  for r in select * from pg_temp.demo_prod order by sku loop
    insert into public.items (organization_id, type, sku, name, category_id, unit_id, sale_price,
      standard_labor_minutes, overhead_per_unit, created_at, created_by)
    values (p_org, 'finished_good', r.sku, r.name,
      (select c.id from public.categories c where c.organization_id = p_org and c.name = r.category),
      (select u.id from public.units u where u.code = 'u'), r.price, r.minutes, r.overhead, v_at, p_actor)
    returning id into v_id;
    update pg_temp.demo_prod set item_id = v_id where sku = r.sku;
    insert into public.boms (organization_id, item_id, output_qty, created_at, created_by)
    values (p_org, v_id, r.output, v_at, p_actor) returning id into v_bom;
    insert into public.bom_lines (organization_id, bom_id, component_item_id, quantity, position)
    select p_org, v_bom, dr.item_id, rc.qty, row_number() over (order by rc.raw)
    from pg_temp.demo_recipe rc join pg_temp.demo_raw dr on dr.sku = rc.raw
    where rc.product = r.sku;
  end loop;

  -- Personal ------------------------------------------------------------------------------
  insert into public.areas (organization_id, name, created_at, created_by)
  select p_org, a, v_at, p_actor
  from unnest(array['Inyección', 'Soplado', 'Extrusión', 'Depósito', 'Calidad', 'Mantenimiento', 'Administración']) a;

  insert into public.employees (organization_id, first_name, last_name, position, area_id, hire_date, hourly_cost, created_at, created_by)
  select p_org, e.fn, e.ln, e.pos,
    (select a.id from public.areas a where a.organization_id = p_org and a.name = e.area),
    v_start - e.seniority, e.cost, v_at, p_actor
  from (values
    ('Marcelo', 'Ríos', 'Jefe de turno', 'Inyección', 2900, 7400),
    ('Lucía', 'Fernández', 'Operaria de inyectora', 'Inyección', 1400, 5600),
    ('Diego', 'Acosta', 'Operario de inyectora', 'Inyección', 900, 5600),
    ('Brenda', 'Medina', 'Operaria de inyectora', 'Inyección', 300, 5400),
    ('Raúl', 'Ojeda', 'Jefe de turno', 'Soplado', 3600, 7400),
    ('Sofía', 'Herrera', 'Operaria de sopladora', 'Soplado', 1200, 5600),
    ('Nahuel', 'Benítez', 'Operario de sopladora', 'Soplado', 700, 5500),
    ('Karina', 'Molina', 'Operaria de sopladora', 'Soplado', 200, 5400),
    ('Pablo', 'Gutiérrez', 'Operario de extrusora', 'Extrusión', 1800, 5700),
    ('Jorge', 'Paz', 'Ayudante de producción', 'Extrusión', 400, 4800),
    ('Ramiro', 'Castro', 'Encargado de depósito', 'Depósito', 2500, 6000),
    ('Walter', 'Sosa', 'Autoelevadorista', 'Depósito', 1100, 5200),
    ('Andrea', 'Romero', 'Analista de calidad', 'Calidad', 1600, 6300),
    ('Hernán', 'Vega', 'Técnico mecánico', 'Mantenimiento', 2100, 6800),
    ('Laura', 'Benítez', 'Administración', 'Administración', 3200, 6200),
    ('Gustavo', 'Peralta', 'Compras', 'Administración', 1500, 6200)
  ) as e(fn, ln, pos, area, seniority, cost);

  -- Plan de producción (60 órdenes) y consumo esperado -------------------------------------
  create temp table demo_plan (k int primary key, sku text, qty numeric, create_d int, start_d int, end_d int,
    fate text, order_id uuid, shortage_buy boolean not null default false, qc_d int) on commit drop;
  for v_k in 1..60 loop
    select * into r from pg_temp.demo_prod where sku = v_skus[1 + ((v_k * 5) % 12)];
    v_qty := greatest(r.step, round((r.qmin + random()::numeric * (r.qmax - r.qmin)) / r.step) * r.step);
    v_d := 2 + floor((v_k - 1) * 172.0 / 59)::int;
    v_lead := v_d + 1 + floor(random()::numeric * 3)::int;
    insert into pg_temp.demo_plan (k, sku, qty, create_d, start_d, end_d, fate)
    values (v_k, r.sku, v_qty, v_d, v_lead, v_lead + 2 + floor(random()::numeric * 4)::int,
      case
        when v_k in (17, 41) then 'cancel_progress'
        when v_k = 29 then 'cancel_planned'
        when v_k in (51, 54, 56) then 'stalled'
        when v_k = 58 then 'hold_progress'
        when v_k = 59 then 'hold_qc'
        else 'normal'
      end);
  end loop;

  create temp table demo_usage (sku text primary key, daily numeric, rp numeric, lot numeric) on commit drop;
  insert into pg_temp.demo_usage (sku, daily)
  select rc.raw, sum(private.bom_requirement(p.qty, rc.qty, pr.output, 3)) / v_days
  from pg_temp.demo_plan p
  join pg_temp.demo_prod pr on pr.sku = p.sku
  join pg_temp.demo_recipe rc on rc.product = p.sku
  group by rc.raw;
  update pg_temp.demo_usage set rp = daily * 14, lot = daily * 45;

  create temp table demo_delivery (po_id uuid, due_d int, fraction numeric, action text not null default 'receive', seq int)
    on commit drop;

  -- Simulación día por día (hasta ayer) -------------------------------------------------------
  for v_d in 0 .. v_days - 1 loop
    v_day := v_start + v_d;
    v_tick := 0;

    -- Stock inicial: una compra por proveedor recibida el primer día.
    if v_d = 0 then
      perform private.log_activity(p_org, p_actor, 'organization', p_org, 'seeded',
        'Cargó el catálogo inicial: 12 productos, 14 materias primas, 5 proveedores y 16 empleados',
        '{}'::jsonb, private.demo_at(v_day, v_tick, v_tz));
      v_tick := v_tick + 3;
      for r in select * from pg_temp.demo_sup order by key loop
        select jsonb_agg(jsonb_build_object('item_id', dr.item_id,
                 'quantity', private.demo_round_qty(u.daily * 50, dr.unit), 'unit_price', dr.cost) order by dr.sku)
          into v_lines
          from pg_temp.demo_raw dr join pg_temp.demo_usage u on u.sku = dr.sku
         where dr.supplier = r.key;
        v_at := private.demo_at(v_day, v_tick, v_tz); v_tick := v_tick + 3;
        v_po := private.demo_new_po(p_org, r.id, v_lines, 'Stock inicial', p_actor, v_at);
        perform private.confirm_purchase_order_core(v_po, p_actor, v_at);
        v_at := private.demo_at(v_day, v_tick, v_tz); v_tick := v_tick + 3;
        perform private.demo_receive(v_po, 1, p_actor, v_at);
      end loop;
    end if;

    -- Entregas y cierres programados.
    for r in
      select dd.*, po.status from pg_temp.demo_delivery dd join public.purchase_orders po on po.id = dd.po_id
      where dd.due_d = v_d order by dd.seq
    loop
      v_at := private.demo_at(v_day, v_tick, v_tz); v_tick := v_tick + 3;
      if r.action = 'close' then
        if r.status = 'partially_received' then
          perform private.cancel_purchase_order_core(r.po_id, 'El proveedor no tiene el saldo', p_actor, v_at);
        end if;
      elsif r.status in ('pending', 'partially_received') then
        perform private.demo_receive(r.po_id, r.fraction, p_actor, v_at);
      end if;
    end loop;

    -- Compras de reposición: una orden por proveedor cuando algún material queda bajo el punto de pedido.
    if v_d > 0 then
      for r in select * from pg_temp.demo_sup order by key loop
        continue when exists (
          select 1 from public.purchase_orders po
          where po.organization_id = p_org and po.supplier_id = r.id and po.status in ('draft', 'pending', 'partially_received'));
        continue when not exists (
          select 1 from pg_temp.demo_raw dr
          join pg_temp.demo_usage u on u.sku = dr.sku
          join public.item_stock_status s on s.item_id = dr.item_id
          where dr.supplier = r.key and s.available < u.rp);
        select jsonb_agg(jsonb_build_object('item_id', dr.item_id,
                 'quantity', private.demo_round_qty(u.lot + greatest(u.rp - s.available, 0), dr.unit),
                 'unit_price', round(dr.cost * power(1.03, v_d / 30.0) * (0.97 + private.demo_rand(dr.sku || ':precio:' || v_d) * 0.06), 2)) order by dr.sku)
          into v_lines
          from pg_temp.demo_raw dr
          join pg_temp.demo_usage u on u.sku = dr.sku
          join public.item_stock_status s on s.item_id = dr.item_id
         where dr.supplier = r.key and s.available < u.rp * 2;
        v_at := private.demo_at(v_day, v_tick, v_tz); v_tick := v_tick + 3;
        v_po := private.demo_new_po(p_org, r.id, v_lines, 'Reposición', p_actor, v_at);
        perform private.confirm_purchase_order_core(v_po, p_actor, v_at);
        v_lead := 4 + floor(random()::numeric * 5)::int;
        if random()::numeric < 0.3 then
          insert into pg_temp.demo_delivery (po_id, due_d, fraction, seq) values
            (v_po, v_d + v_lead, 0.6, v_d * 100 + v_tick),
            (v_po, v_d + v_lead + 3 + floor(random()::numeric * 3)::int, 1, v_d * 100 + v_tick + 1);
        else
          insert into pg_temp.demo_delivery (po_id, due_d, fraction, seq) values (v_po, v_d + v_lead, 1, v_d * 100 + v_tick);
        end if;
      end loop;
    end if;

    -- Compras especiales para que existan todos los estados.
    if v_d = 60 then
      select id into v_sup from pg_temp.demo_sup where key = 'c-col';
      v_at := private.demo_at(v_day, v_tick, v_tz); v_tick := v_tick + 3;
      v_po := private.demo_new_po(p_org, v_sup, jsonb_build_array(jsonb_build_object(
        'item_id', (select item_id from pg_temp.demo_raw where sku = 'MB-ROJO'), 'quantity', 25, 'unit_price', 11500)),
        'Cotización alternativa', p_actor, v_at);
      v_at := private.demo_at(v_day, v_tick, v_tz); v_tick := v_tick + 3;
      perform private.cancel_purchase_order_core(v_po, 'Se consiguió mejor precio con el proveedor habitual', p_actor, v_at);
    elsif v_d = 150 then
      select id into v_sup from pg_temp.demo_sup where key = 'b-pol';
      v_at := private.demo_at(v_day, v_tick, v_tz); v_tick := v_tick + 3;
      v_po := private.demo_new_po(p_org, v_sup, jsonb_build_array(jsonb_build_object(
        'item_id', (select item_id from pg_temp.demo_raw where sku = 'PP-HOMO'), 'quantity', 500,
        'unit_price', round(1700 * power(1.03, v_d / 30.0), 2))), 'Compra puntual', p_actor, v_at);
      perform private.confirm_purchase_order_core(v_po, p_actor, v_at);
      insert into pg_temp.demo_delivery (po_id, due_d, fraction, action, seq) values
        (v_po, v_d + 5, 0.4, 'receive', v_d * 100 + 99),
        (v_po, v_d + 15, 0, 'close', v_d * 100 + 98);
    elsif v_d = v_days - 6 then
      select id into v_sup from pg_temp.demo_sup where key = 'a-sur';
      v_at := private.demo_at(v_day, v_tick, v_tz); v_tick := v_tick + 3;
      v_po := private.demo_new_po(p_org, v_sup, jsonb_build_array(jsonb_build_object(
        'item_id', (select item_id from pg_temp.demo_raw where sku = 'PEAD-SOP'), 'quantity', 1500,
        'unit_price', round(1850 * power(1.03, v_d / 30.0), 2))), 'Entrega en dos partes', p_actor, v_at);
      perform private.confirm_purchase_order_core(v_po, p_actor, v_at);
      insert into pg_temp.demo_delivery (po_id, due_d, fraction, seq) values
        (v_po, v_d + 3, 0.5, v_d * 100 + 99), (v_po, v_d + 12, 1, v_d * 100 + 98);
    elsif v_d = v_days - 2 then
      select id into v_sup from pg_temp.demo_sup where key = 'c-col';
      v_at := private.demo_at(v_day, v_tick, v_tz); v_tick := v_tick + 3;
      v_po := private.demo_new_po(p_org, v_sup, jsonb_build_array(jsonb_build_object(
        'item_id', (select item_id from pg_temp.demo_raw where sku = 'MB-BLAN'), 'quantity', 50,
        'unit_price', round(8600 * power(1.03, v_d / 30.0), 2))), 'Pedido anticipado', p_actor, v_at);
      perform private.confirm_purchase_order_core(v_po, p_actor, v_at);
    elsif v_d = v_days - 1 then
      select id into v_sup from pg_temp.demo_sup where key = 'd-etq';
      v_at := private.demo_at(v_day, v_tick, v_tz); v_tick := v_tick + 3;
      perform private.demo_new_po(p_org, v_sup, jsonb_build_array(
        jsonb_build_object('item_id', (select item_id from pg_temp.demo_raw where sku = 'ETQ'), 'quantity', 20000,
          'unit_price', round(38 * power(1.03, v_d / 30.0), 2)),
        jsonb_build_object('item_id', (select item_id from pg_temp.demo_raw where sku = 'PREC'), 'quantity', 15000,
          'unit_price', round(12 * power(1.03, v_d / 30.0), 2))), 'Borrador para revisar precios', p_actor, v_at);
    end if;

    -- Producción: nuevas órdenes.
    for r in select p.*, pr.item_id, pr.area from pg_temp.demo_plan p join pg_temp.demo_prod pr on pr.sku = p.sku
             where p.create_d = v_d order by p.k loop
      select e.id into v_resp from public.employees e join public.areas a on a.id = e.area_id
       where e.organization_id = p_org and a.name = r.area and e.position = 'Jefe de turno';
      select array_agg(x.id order by x.last_name) into v_ops from (
        select e.id, e.last_name from public.employees e join public.areas a on a.id = e.area_id
         where e.organization_id = p_org and a.name = r.area and e.position <> 'Jefe de turno'
         order by e.last_name offset (r.k % 2) limit 2) x;
      v_at := private.demo_at(v_day, v_tick, v_tz); v_tick := v_tick + 3;
      v_order := private.create_production_order_core(p_org, r.item_id, r.qty, v_start + r.start_d, v_start + r.end_d,
        case r.k % 7 when 0 then 'urgent' when 1 then 'high' when 2 then 'high' when 3 then 'low' else 'normal' end,
        v_resp, v_ops, null, p_actor, v_at);
      update pg_temp.demo_plan set order_id = v_order.id where k = r.k;
    end loop;

    -- Producción: avance de las órdenes activas.
    for r in select p.* from pg_temp.demo_plan p join public.production_orders o on o.id = p.order_id
             where o.status in ('planned', 'in_progress', 'quality_check') order by p.k loop
      select * into v_order from public.production_orders where id = r.order_id;

      if v_order.status = 'planned' then
        continue when r.fate = 'stalled' or r.start_d > v_d;
        v_at := private.demo_at(v_day, v_tick, v_tz); v_tick := v_tick + 3;
        if r.fate = 'cancel_planned' then
          perform private.cancel_production_order_core(r.order_id, 'El cliente postergó el pedido', '[]'::jsonb, p_actor, v_at);
          continue;
        end if;
        if exists (select 1 from public.production_order_materials pm join public.items i on i.id = pm.item_id
                   where pm.production_order_id = r.order_id and pm.planned_qty > i.current_stock) then
          if not r.shortage_buy then
            select count(distinct dr.supplier) into v_missing_suppliers
              from public.production_order_materials pm
              join public.items i on i.id = pm.item_id
              join pg_temp.demo_raw dr on dr.item_id = pm.item_id
             where pm.production_order_id = r.order_id and pm.planned_qty > i.current_stock;
            if v_missing_suppliers = 1 then
              select s.id into v_sup
                from public.production_order_materials pm
                join public.items i on i.id = pm.item_id
                join pg_temp.demo_raw dr on dr.item_id = pm.item_id
                join pg_temp.demo_sup s on s.key = dr.supplier
               where pm.production_order_id = r.order_id and pm.planned_qty > i.current_stock
               limit 1;
              v_po := (private.create_purchase_from_shortages_core(r.order_id, v_sup, p_actor, v_at)).id;
              perform private.confirm_purchase_order_core(v_po, p_actor, v_at);
              insert into pg_temp.demo_delivery (po_id, due_d, fraction, seq) values (v_po, v_d + 3, 1, v_d * 100 + v_tick);
            else
              for m in
                select s.key, s.id as supplier_id from public.production_order_materials pm
                  join public.items i on i.id = pm.item_id
                  join pg_temp.demo_raw dr on dr.item_id = pm.item_id
                  join pg_temp.demo_sup s on s.key = dr.supplier
                 where pm.production_order_id = r.order_id and pm.planned_qty > i.current_stock
                 group by s.key, s.id order by s.key
              loop
                select jsonb_agg(jsonb_build_object('item_id', pm.item_id,
                         'quantity', private.demo_round_qty(pm.planned_qty - i.current_stock + u.lot, dr.unit),
                         'unit_price', round(dr.cost * power(1.03, v_d / 30.0), 2)) order by dr.sku)
                  into v_lines
                  from public.production_order_materials pm
                  join public.items i on i.id = pm.item_id
                  join pg_temp.demo_raw dr on dr.item_id = pm.item_id
                  join pg_temp.demo_usage u on u.sku = dr.sku
                 where pm.production_order_id = r.order_id and pm.planned_qty > i.current_stock and dr.supplier = m.key;
                v_po := private.demo_new_po(p_org, m.supplier_id, v_lines, 'Compra urgente por faltantes', p_actor, v_at);
                perform private.confirm_purchase_order_core(v_po, p_actor, v_at);
                insert into pg_temp.demo_delivery (po_id, due_d, fraction, seq) values (v_po, v_d + 3, 1, v_d * 100 + v_tick);
                v_tick := v_tick + 1;
              end loop;
            end if;
            update pg_temp.demo_plan set shortage_buy = true where k = r.k;
          end if;
          continue;
        end if;
        v_order := private.start_production_order_core(r.order_id, p_actor, v_at);
      end if;

      if v_order.status = 'in_progress' then
        v_at := private.demo_at(v_day, v_tick, v_tz); v_tick := v_tick + 3;
        if r.fate = 'cancel_progress' and v_order.started_at < private.demo_at(v_day, 0, v_tz) then
          select jsonb_agg(jsonb_build_object('item_id', x.item_id, 'quantity', x.qty) order by x.sku) into v_cons
            from (select pm.item_id, i.sku,
                    round(pm.consumed_qty * 0.4, case when u.allows_decimals then 3 else 0 end) as qty
                  from public.production_order_materials pm
                  join public.items i on i.id = pm.item_id join public.units u on u.id = i.unit_id
                  where pm.production_order_id = r.order_id) x
           where x.qty > 0;
          perform private.cancel_production_order_core(r.order_id, 'Falla en el molde: se suspende la orden',
            coalesce(v_cons, '[]'::jsonb), p_actor, v_at);
          continue;
        end if;
        v_remaining := v_order.planned_qty - v_order.good_qty - v_order.defective_qty;
        if v_remaining > 0 then
          v_daily := ceil(v_order.planned_qty / greatest(r.end_d - r.start_d, 1));
          v_qty := least(v_daily, v_remaining);
          v_def := floor(v_qty * random()::numeric * 0.03);
          v_good := v_qty - v_def;
          perform private.report_production_progress_core(r.order_id, v_good, v_def, v_resp, v_day, null, p_actor, v_at);
          v_remaining := v_remaining - v_qty;
        end if;
        if v_remaining <= 0 and r.fate <> 'hold_progress' then
          v_at := private.demo_at(v_day, v_tick, v_tz); v_tick := v_tick + 3;
          perform private.send_to_quality_check_core(r.order_id, p_actor, v_at);
          update pg_temp.demo_plan set qc_d = v_d where k = r.k;
        end if;
        continue;
      end if;

      if v_order.status = 'quality_check' then
        continue when r.fate = 'hold_qc' or r.qc_d = v_d;
        select jsonb_agg(jsonb_build_object('item_id', x.item_id, 'quantity', x.real) order by x.sku) into v_cons
          from (
            select pm.item_id, i.sku,
              case when q.real > pm.consumed_qty and q.real - pm.consumed_qty > i.current_stock then pm.consumed_qty
                   else q.real end as real
            from public.production_order_materials pm
            join public.items i on i.id = pm.item_id
            join public.units u on u.id = i.unit_id
            cross join lateral (
              select round(pm.consumed_qty * (0.97 + private.demo_rand(i.sku || ':consumo:' || r.k) * 0.07), case when u.allows_decimals then 3 else 0 end) as real
            ) q
            where pm.production_order_id = r.order_id
          ) x;
        select jsonb_agg(jsonb_build_object('employee_id', a.employee_id,
                 'hours', round((r.end_d - r.start_d + 1) * 8 * (0.8 + private.demo_rand(e.last_name || e.first_name || ':horas:' || r.k) * 0.2), 1)) order by e.last_name)
          into v_hours
          from public.production_order_assignments a join public.employees e on e.id = a.employee_id
         where a.production_order_id = r.order_id;
        v_good := v_order.good_qty;
        v_def := v_order.defective_qty;
        if random()::numeric < 0.15 then
          v_n := floor(v_good * 0.01);
          v_good := v_good - v_n;
          v_def := v_def + v_n;
        end if;
        v_at := private.demo_at(v_day, v_tick, v_tz); v_tick := v_tick + 3;
        perform private.complete_production_order_core(r.order_id, v_good, v_def, v_cons, coalesce(v_hours, '[]'::jsonb),
          null, p_actor, v_at);
      end if;
    end loop;

    -- Viernes: despacho de producto terminado a clientes.
    if extract(isodow from v_day) = 5 then
      for r in select dp.item_id, dp.name, i.current_stock from pg_temp.demo_prod dp join public.items i on i.id = dp.item_id
               where i.current_stock > 0 order by dp.sku loop
        v_qty := floor(r.current_stock * (0.25 + random()::numeric * 0.2));
        continue when v_qty <= 0;
        v_at := private.demo_at(v_day, v_tick, v_tz); v_tick := v_tick + 3;
        perform private.insert_movement(p_org, r.item_id, 'manual_out', -v_qty, null, 'Despacho a clientes',
          '{}'::jsonb, p_actor, v_at);
        perform private.log_activity(p_org, p_actor, 'item', r.item_id, 'manual_out',
          'Registró una salida manual de ' || private.fmt_qty(v_qty) || ' u de ' || r.name || ' (Despacho a clientes)',
          '{}'::jsonb, v_at);
      end loop;
    end if;

    -- Fin de mes: inventario físico con pequeñas diferencias.
    if extract(day from v_day + 1) = 1 then
      for r in select dr.item_id, dr.name, dr.unit, i.current_stock from pg_temp.demo_raw dr join public.items i on i.id = dr.item_id
               where dr.sku in (v_raw_skus[1 + (extract(month from v_day)::int % 14)],
                                v_raw_skus[1 + ((extract(month from v_day)::int + 7) % 14)])
                 and i.current_stock > 0
               order by dr.sku loop
        v_qty := round(r.current_stock * (random()::numeric * 0.02 - 0.012), case when r.unit = 'u' then 0 else 3 end);
        continue when v_qty = 0;
        v_at := private.demo_at(v_day, v_tick, v_tz); v_tick := v_tick + 3;
        perform private.insert_movement(p_org, r.item_id, 'adjustment', v_qty, null, 'Inventario mensual',
          '{}'::jsonb, p_actor, v_at);
        perform private.log_activity(p_org, p_actor, 'item', r.item_id, 'stock_adjusted',
          'Ajustó el stock de ' || r.name || ': ' || case when v_qty > 0 then '+' else '' end || private.fmt_qty(v_qty)
            || ' ' || r.unit || ' (Inventario mensual)', '{}'::jsonb, v_at);
      end loop;
    end if;
  end loop;

  -- Mínimos: materias primas ≈ 7 días de consumo; productos ≈ un décimo de la tanda más chica.
  update public.items i set min_stock = case when dr.unit = 'u' then ceil(u.daily * 7 / 100) * 100 else ceil(u.daily * 7 / 5) * 5 end
    from pg_temp.demo_raw dr join pg_temp.demo_usage u on u.sku = dr.sku
   where i.id = dr.item_id;
  update public.items i set min_stock = greatest(dp.step, round(dp.qmin / 10 / dp.step) * dp.step)
    from pg_temp.demo_prod dp
   where i.id = dp.item_id;
  -- Garantiza alertas visibles: las materias primas con menor cobertura quedan bajo el mínimo.
  select count(*) into v_low from public.item_stock_status s where s.organization_id = p_org and s.level <> 'ok';
  if v_low < 3 then
    update public.items i set min_stock = private.demo_round_qty(i.current_stock * 1.25 + 1, dr.unit)
      from pg_temp.demo_raw dr
     where i.id = dr.item_id and dr.sku in (
       select dr2.sku from pg_temp.demo_raw dr2 join public.items i2 on i2.id = dr2.item_id
       join pg_temp.demo_usage u2 on u2.sku = dr2.sku
       where i2.current_stock >= i2.min_stock
       order by i2.current_stock / nullif(u2.daily, 0), dr2.sku
       limit 3 - v_low);
  end if;

  -- Verificación final: el stock tiene que ser exactamente la suma de sus movimientos.
  if exists (
    select 1 from public.items i
    left join public.stock_movements sm on sm.item_id = i.id
    where i.organization_id = p_org
    group by i.id, i.current_stock
    having i.current_stock <> coalesce(sum(sm.quantity), 0)
  ) then
    raise exception 'La demo quedó inconsistente: el stock no coincide con los movimientos' using errcode = 'P0001';
  end if;

  perform set_config('fabril.seeding', 'off', true);
end
$$;

-- Alta de la demo (sólo servidor / script) -----------------------------------------------------

create function public.admin_create_demo_organization(p_user uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
begin
  if exists (select 1 from public.memberships m join public.organizations o on o.id = m.organization_id
             where m.user_id = p_user and o.is_demo) then
    raise exception 'Este usuario ya tiene una organización demo: restablecela desde Configuración' using errcode = 'P0001';
  end if;
  v_org := public.admin_create_organization('Plásticos del Litoral S.A.', p_user, true);
  update public.organizations set
    legal_name = 'Plásticos del Litoral S.A.',
    cuit = '30-71589634-2',
    address = 'Ruta 11 km 452, Parque Industrial',
    city = 'San Lorenzo',
    province = 'Santa Fe',
    phone = '03476 42-5500',
    email = 'administracion@plasticoslitoral.example',
    default_labor_rate = 6500,
    default_waste_pct = 3
  where id = v_org;
  perform private.seed_demo(v_org, p_user);
  return v_org;
end
$$;

-- Restablecer (desde Configuración, sólo admins y sólo en organizaciones demo) ----------------------

create function public.reset_demo_organization(p_org uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := private.require_role(p_org, '{admin}');
begin
  if not coalesce((select o.is_demo from public.organizations o where o.id = p_org), false) then
    raise exception 'Sólo las organizaciones demo se pueden restablecer' using errcode = 'P0001';
  end if;
  perform 1 from public.organizations where id = p_org for update;

  perform set_config('fabril.purge', 'on', true);
  delete from public.stock_movements where organization_id = p_org;
  delete from public.production_order_events where organization_id = p_org;
  delete from public.production_reports where organization_id = p_org;
  delete from public.production_order_assignments where organization_id = p_org;
  delete from public.production_order_materials where organization_id = p_org;
  delete from public.production_orders where organization_id = p_org;
  delete from public.purchase_receipt_lines where organization_id = p_org;
  delete from public.purchase_receipts where organization_id = p_org;
  delete from public.purchase_order_lines where organization_id = p_org;
  delete from public.purchase_orders where organization_id = p_org;
  delete from public.bom_lines where organization_id = p_org;
  delete from public.boms where organization_id = p_org;
  delete from public.employees where organization_id = p_org;
  delete from public.areas where organization_id = p_org;
  delete from public.items where organization_id = p_org;
  delete from public.categories where organization_id = p_org;
  delete from public.suppliers where organization_id = p_org;
  delete from public.activity_log where organization_id = p_org;
  delete from public.document_sequences where organization_id = p_org;
  perform set_config('fabril.purge', 'off', true);

  perform private.seed_demo(p_org, v_actor);
  perform private.log_activity(p_org, v_actor, 'organization', p_org, 'demo_reset', 'Restableció los datos de demostración');
end
$$;

revoke execute on function public.admin_create_demo_organization(uuid) from public, anon, authenticated;
grant execute on function public.admin_create_demo_organization(uuid) to service_role;
revoke execute on function public.reset_demo_organization(uuid) from public, anon;
grant execute on function public.reset_demo_organization(uuid) to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.user_org_ids(), private.user_admin_org_ids(), private.colleague_ids(),
  private.is_draft_purchase(uuid), private.is_active_production(uuid), private.uuid_or_null(text)
  to authenticated;
