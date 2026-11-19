# FABRIL Etapa 3 — Base de datos y autenticación · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Esquema completo de FABRIL en Supabase (tablas, RLS, triggers, funciones de negocio transaccionales, vistas, storage), autenticación real del panel `/app` con organización activa, gestión de usuarios por invitación, datos demo generados por las mismas reglas de negocio, y pruebas SQL automáticas que corren sin Docker.

**Architecture:** Las migraciones SQL versionadas en `supabase/migrations/` son la única fuente del esquema. Se prueban localmente con **PGlite** (Postgres 17 compilado a WASM, corre dentro de Vitest) sobre un *shim* mínimo de Supabase (roles `anon`/`authenticated`/`service_role`, `auth.uid()`, `storage`), y se aplican a la nube con el CLI de Supabase. Toda operación que mueve stock o cambia estados es una función `security definer` con un núcleo privado (`private.*_core`) que recibe actor y fecha, para que los datos demo usen exactamente el mismo camino con fechas históricas. En Next.js, `@supabase/ssr` con cookies, `src/proxy.ts` para refrescar la sesión y una capa de acceso (`lib/auth`) que valida sesión, membresía y rol en cada Server Component y Server Action.

**Tech Stack:** Supabase (Postgres 17, Auth, Storage), `@supabase/supabase-js` 2.118.0, `@supabase/ssr` 0.12.7, `supabase` CLI 3.1.0 (dev), `@electric-sql/pglite` 0.5.13 (dev), `server-only`, Next.js 16.4 (proxy, Server Actions, `cacheComponents`), Zod 4, Vitest.

**Spec:** `docs/plan-tecnico.md` (§3 multi-tenancy y auth, §4 modelo de datos, §5 flujos, §8 demo, §9 seguridad, §10 Etapa 3, §11 decisiones).

## Global Constraints

- Tablas, columnas y funciones en inglés; mensajes de error que ve el usuario en español rioplatense (voseo), listos para mostrar (ej. `No hay stock suficiente de Polietileno AD: faltan 12,500 kg`).
- Tipos: cantidades `numeric(14,3)`, importes `numeric(14,2)`, costos unitarios `numeric(14,4)`, fechas de calendario `date`, instantes `timestamptz`. Zona `America/Argentina/Buenos_Aires` para “hoy” y para el año de los códigos.
- Toda tabla de negocio: `id uuid default gen_random_uuid()`, `organization_id uuid not null` indexado, `created_at`, `updated_at` (trigger), `created_by default auth.uid()`.
- RLS habilitado en **todas** las tablas de `public`. Lectura: miembro activo. Escritura: rol `admin` (vía `private.has_role`). Nada se habilita por los privilegios por defecto de Supabase: cada tabla hace `revoke all ... from anon, authenticated` y concede explícitamente.
- Funciones `security definer` con `set search_path = ''` y nombres calificados; `revoke execute ... from public, anon`. Las de uso administrativo (crear fábrica, crear demo) sólo `service_role`.
- Columnas mantenidas por triggers sin permiso de UPDATE para `authenticated` (grants por columna): `items.current_stock`, `items.avg_cost`, `purchase_order_lines.received_qty`, totales de compras, `status` y `code` de órdenes, `organization_id` de todo.
- `stock_movements`, `production_order_events` y `activity_log` son inmutables (sin grants de escritura + trigger que rechaza UPDATE/DELETE salvo purga interna de una organización demo).
- La clave secreta sólo en `src/lib/supabase/admin.ts` (`import "server-only"`) y en `scripts/`. Nunca `NEXT_PUBLIC_` salvo URL y clave publicable.
- Nunca se confía en un `organization_id` enviado por el cliente: sale de la sesión validada.
- Versiones exactas (`.npmrc save-exact`). Scripts de Node en TypeScript ejecutados con `node --env-file=.env.local` (Node 24 quita tipos de forma nativa; sólo `import type`, sin `enum`).

## Review Focus

1. **Aislamiento entre fábricas por API directa**: un usuario de la fábrica A que llama a PostgREST o a una RPC con un id de la fábrica B no lee, no escribe y recibe error → pruebas en Task 2–6 (PGlite) y `scripts/verify-cloud.ts` en Task 12 (nube real, usuarios reales).
2. **Stock = Σ movimientos y costo promedio correcto** tras secuencias mixtas (compra, consumo, devolución, anulación, ajuste con stock en cero) → tabla de casos en Task 4 y verificación global en Task 8.
3. **Concurrencia/doble envío**: dos `start_production_order` o dos recepciones sobre lo mismo no consumen dos veces → bloqueo `for update` de la orden y verificación de estado dentro de la transacción; test que llama dos veces y espera error en la segunda (Task 5 y 6).
4. **Redirecciones abiertas y enlaces de auth**: `?next=https://otro.sitio` o `//otro.sitio` nunca redirige fuera de `/app` → test de `safeNextPath` en Task 9.
5. **Último administrador**: nadie puede deshabilitarse ni quitarse el rol si es el último admin activo, ni siquiera por API → test en Task 2 y en Task 11.

---

### Task 1: Herramientas de base de datos y entorno de pruebas SQL

**Files:**
- Create: `supabase/config.toml` (vía `npx supabase init`), `supabase/tests/shim.sql`, `supabase/tests/db.ts`, `supabase/tests/harness.test.ts`
- Modify: `package.json` (deps + scripts), `vitest.config.ts` (incluir `supabase/tests/**/*.test.ts`, timeout 60 s para esos archivos), `tsconfig.json` (incluir `supabase/tests`, `scripts`; `allowImportingTsExtensions`)

**Interfaces:**
- Produces (`supabase/tests/db.ts`):
  - `createTestDb(): Promise<TestDb>` — PGlite nuevo con `shim.sql` + todas las migraciones de `supabase/migrations/*.sql` en orden de nombre. Cachea el directorio de datos ya migrado (`dumpDataDir`) por proceso para que cada archivo de test arranque de una copia.
  - `TestDb = { pg: PGlite; as<T>(user: string | "anon" | "service", fn: (q: Query) => Promise<T>): Promise<T>; createUser(email: string, fullName?: string): Promise<string>; createOrg(name: string, adminUserId: string, opts?: { isDemo?: boolean }): Promise<string>; close(): Promise<void> }`
  - `as()` abre transacción, `set local role authenticated|anon|service_role`, fija `request.jwt.claims` (`{"sub": id, "role": "authenticated"}`), ejecuta y hace `commit` (o `rollback` si `fn` lanza, re-lanzando el error).
  - `Query = { many<R>(sql, params?): Promise<R[]>; one<R>(sql, params?): Promise<R>; exec(sql, params?): Promise<void> }`
- `shim.sql` (sólo para pruebas, nunca se aplica en la nube): roles `anon`, `authenticated`, `service_role bypassrls`; esquemas `auth`, `storage`, `extensions`; `auth.users(id, email, raw_user_meta_data jsonb, created_at, last_sign_in_at)`; `auth.uid()`, `auth.jwt()`, `auth.role()` leyendo `request.jwt.claims`; `storage.buckets`, `storage.objects(bucket_id, name, owner)` con RLS, `storage.foldername(text)`; privilegios por defecto como Supabase (`grant all` en tablas/funciones/secuencias de `public` a `anon, authenticated, service_role`) para que las pruebas detecten cualquier dependencia de esos defaults.

- [ ] **Step 1:** Instalar `@supabase/supabase-js@2.118.0 @supabase/ssr@0.12.7 server-only@0.0.1` y dev `supabase@3.1.0 @electric-sql/pglite@0.5.13`. `npx supabase init` (sin VS Code settings). Agregar scripts `test:db` (`vitest run supabase/tests`).
- [ ] **Step 2:** Test `harness.test.ts`: (a) `createUser` crea fila en `auth.users`; (b) `as(user, q => q.one("select auth.uid() as id"))` devuelve el id; (c) `as("anon", ...)` sobre una tabla de prueba creada en el test sin grants → error `permission denied`.
- [ ] **Step 3:** Run `npx vitest run supabase/tests/harness.test.ts` → FAIL (`createTestDb` no existe).
- [ ] **Step 4:** Implementar `shim.sql` y `db.ts` (sin migraciones todavía: `createOrg` se implementa en Task 2).
- [ ] **Step 5:** Run → PASS. `npm test` completo → verde.
- [ ] **Step 6:** Commit `chore: entorno de pruebas SQL con PGlite y CLI de Supabase`.

### Task 2: Núcleo — organizaciones, perfiles, membresías y permisos

**Files:**
- Create: `supabase/migrations/20261118000100_foundation.sql`, `supabase/tests/foundation.test.ts`

**Interfaces:**
- Produces (SQL):
  - Esquema `private` (sin `usage` para `anon`; `authenticated` sólo `execute` en helpers de RLS).
  - `create type public.app_role as enum ('admin')`; `public.membership_status as enum ('active','disabled')`.
  - Tablas: `organizations` (columnas de §4.2 del spec; `is_demo bool default false`, `default_waste_pct numeric(5,2) default 3`, `default_labor_rate numeric(14,2) default 0`, `allow_negative_stock bool default false`, `timezone text default 'America/Argentina/Buenos_Aires'`), `profiles(id → auth.users on delete cascade, full_name, avatar_path, last_organization_id)`, `memberships(organization_id, user_id, role app_role, status membership_status, invited_by, unique(organization_id,user_id))`, `document_sequences(organization_id, doc_type text check in ('OP','OC','AJ'), year int, last_value int, primary key(organization_id,doc_type,year))`, `activity_log(organization_id, actor_id, entity_type, entity_id, action, summary, metadata jsonb, occurred_at)`.
  - `private.user_org_ids() returns setof uuid` y `private.user_admin_org_ids() returns setof uuid` (`stable security definer`, filtran `status='active'` y `user_id = (select auth.uid())`). Las políticas usan `organization_id in (select private.user_org_ids())` para que Postgres las evalúe una vez por consulta.
  - `private.has_role(org uuid, roles public.app_role[]) returns boolean`, `private.require_role(org uuid, roles public.app_role[]) returns uuid` (devuelve `auth.uid()` o lanza `42501` “No tenés permiso para hacer esto en esta fábrica”).
  - `private.set_updated_at()` trigger genérico; `private.purging() returns boolean` (`current_setting('fabril.purge', true) = 'on'`).
  - `private.next_document_code(org uuid, doc_type text, at timestamptz) returns text` → `OP-2026-0001` (año según zona de la organización; `insert ... on conflict do update ... returning`).
  - `private.log_activity(org, actor, entity_type, entity_id, action, summary, metadata, at)`.
  - Trigger `on auth.users insert` → crea `profiles` (`full_name` de `raw_user_meta_data->>'full_name'` o la parte local del email).
  - Trigger en `memberships` (before update/delete): si la organización quedaría sin admin activo → `P0001` “La fábrica tiene que tener al menos un administrador activo”. Se omite cuando `private.purging()`.
  - `public.admin_create_organization(p_name text, p_admin_user uuid, p_is_demo bool default false) returns uuid` — sólo `service_role`.
  - Políticas: `organizations` select miembro / update admin (grant de update sólo en columnas de configuración, nunca `is_demo`); `profiles` select propio + compañeros de fábrica, update propio (`full_name`, `avatar_path`, `last_organization_id`); `memberships` select propio + misma fábrica, update admin (sólo `role`, `status`), sin insert/delete para `authenticated` (las altas pasan por la invitación del servidor, Task 11); `activity_log` select miembro, sin escrituras.
- `supabase/tests/db.ts`: `createOrg` llama a `admin_create_organization` como `service`.

- [ ] **Step 1:** Tests en `foundation.test.ts`:
  - `user A ve su organización y no la de B` (`select id from organizations` como A → sólo A).
  - `anon no ve organizaciones` (error de permiso o 0 filas).
  - `el perfil se crea al crear el usuario` con `full_name` de la metadata y, sin metadata, `"laura"` para `laura@x.com`.
  - `admin_create_organization no es ejecutable por authenticated` → error `permission denied for function`.
  - `no se puede deshabilitar al último admin` (update de su propia membresía a `disabled` → error con el mensaje exacto); `con dos admins sí se puede`.
  - `next_document_code` devuelve `OP-<año>-0001`, `OP-<año>-0002` y para `OC` empieza en `0001`.
  - `un admin de A no puede cambiar is_demo ni organization_id` → `permission denied`.
  - `un usuario no puede actualizar membresías de otra fábrica` → 0 filas afectadas.
- [ ] **Step 2:** Run `npx vitest run supabase/tests/foundation.test.ts` → FAIL (tablas inexistentes).
- [ ] **Step 3:** Escribir la migración.
- [ ] **Step 4:** Run → PASS. `npm run test:db` → verde.
- [ ] **Step 5:** Commit `feat(db): organizaciones, membresías, perfiles y permisos con RLS`.

### Task 3: Catálogo — unidades, categorías, ítems y recetas

**Files:**
- Create: `supabase/migrations/20261118000200_catalog.sql`, `supabase/tests/catalog.test.ts`

**Interfaces:**
- Produces (SQL):
  - `units(id smallint, code, name, allows_decimals)` global, sembrada: `kg` Kilogramo, `g` Gramo, `u` Unidad (sin decimales), `l` Litro, `ml` Mililitro, `m` Metro, `m2` Metro cuadrado. Select para `authenticated`, sin escrituras.
  - `categories(name, applies_to check in ('finished_good','raw_material','both'), color)`, único `(organization_id, lower(name))`.
  - `items` (§4.2 del spec): `type check in ('finished_good','raw_material')`, `sku` único `(organization_id, upper(sku))`, `status check in ('active','inactive')`, `current_stock numeric(14,3) default 0`, `avg_cost numeric(14,4) default 0`, `archived_at`, `preferred_supplier_id` (FK se agrega en Task 5). Grants de update por columna excluyendo `current_stock`, `avg_cost`, `organization_id`, `type`.
  - `boms(item_id unique, output_qty numeric(14,3) default 1 check > 0, default_waste_pct numeric(5,2) null, notes)`, `bom_lines(bom_id on delete cascade, component_item_id, quantity check > 0, waste_pct null check between 0 and 100, position)`.
  - Trigger de validación en `bom_lines` y `boms`: el producto de la receta es `finished_good`, el componente es `raw_material`, ambos de la misma organización que la receta y el componente nunca es el propio producto → `P0001` con mensaje en español.
  - `private.bom_requirement(planned_qty, qty_per_output, output_qty, waste_pct) returns numeric(14,3)` = `round(planned × qty / output × (1 + waste/100), 3)` (misma regla que `calculateMaterialRequirements`).
  - Políticas: select miembro, insert/update/delete admin; `bom_lines` vía `exists` sobre su `boms` en organizaciones del usuario.
  - Trigger `activity_log` en `items` (alta y archivo): “Creó el producto Bidón 5 L azul”, “Archivó la materia prima PEAD”.

- [ ] **Step 1:** Tests: alta de ítem como admin de A ok; como usuario de B con `organization_id` de A → error RLS; `update items set current_stock = 999` → `permission denied`; SKU duplicado en mayúsculas/minúsculas → `23505`; mismo SKU en otra fábrica → ok; receta con componente terminado → mensaje “El componente tiene que ser una materia prima”; receta con componente de otra fábrica → error; **paridad BOM**: para los casos de `src/features/production/logic.test.ts` (1.000 × 0,250 kg × 3 % = 257,500; con `output_qty` 10; con `waste_pct` 0 explícito) `private.bom_requirement` devuelve el mismo valor que `calculateMaterialRequirements` (el test importa la función TS y compara).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Escribir la migración.
- [ ] **Step 4:** Run → PASS; `npm run test:db` verde.
- [ ] **Step 5:** Commit `feat(db): catálogo de ítems, categorías, unidades y recetas`.

### Task 4: Inventario — libro de movimientos, valorización y operaciones manuales

**Files:**
- Create: `supabase/migrations/20261118000300_inventory.sql`, `supabase/tests/inventory.test.ts`

**Interfaces:**
- Produces (SQL):
  - `stock_movements` (§4.2): `movement_type check in ('purchase_receipt','production_output','production_consumption','production_return','production_scrap','adjustment','manual_in','manual_out','reversal')`, `quantity numeric(14,3) check <> 0` (con signo), `unit_cost numeric(14,4)`, `total_cost numeric(14,2)`, `balance_after numeric(14,3)`, `reason`, `occurred_at default now()`, `production_order_id`, `purchase_receipt_line_id`, `reverses_movement_id` (FKs de producción/compras se agregan en Task 5–6). Índices `(organization_id, item_id, occurred_at)`.
  - `private.apply_stock_movement()` trigger `before insert` — algoritmo (bloquea `items` con `for update`):
    ```
    s = current_stock; a = avg_cost; q = NEW.quantity
    si q < 0 y s + q < 0 y no allow_negative_stock → P0001 'No hay stock suficiente de <name>: faltan <fmt(-(s+q))> <unit>'
    costo del movimiento:
      salidas (q<0, excepto reversal) y adjustment q>0 → c = a
      manual_in sin costo informado → c = a
      resto → c = NEW.unit_cost (obligatorio)
    recalcula promedio sólo para: purchase_receipt, production_output, production_return, reversal, manual_in con costo informado
      v = greatest(s,0) × a + q × c ; s' = s + q
      a' = (s' > 0 y v > 0) ? round(v / s', 4) : a
    NEW.unit_cost = c; NEW.total_cost = round(q × c, 2); NEW.balance_after = s + q
    update items set current_stock = s + q, avg_cost = a'
    ```
    El formato del faltante usa coma decimal y 3 decimales (`12,500`), igual que `formatQuantity`.
  - Trigger `before update or delete` en `stock_movements` → `P0001` “Los movimientos de stock no se modifican: registrá un ajuste o una anulación” salvo `private.purging()`.
  - Grants: `select` a `authenticated` con RLS de miembro; ningún insert/update/delete.
  - RPCs (`security definer`, `require_role(org, '{admin}')`, `activity_log`): 
    - `create_stock_adjustment(p_item uuid, p_counted_qty numeric, p_reason text) returns stock_movements` — delta = contado − actual; delta 0 → “El stock contado coincide con el registrado: no hay nada que ajustar”; motivo obligatorio (≥ 3 caracteres).
    - `create_manual_movement(p_item uuid, p_type text, p_quantity numeric, p_reason text, p_unit_cost numeric default null) returns stock_movements` — `p_type in ('manual_in','manual_out')`, cantidad > 0 (el signo lo pone la función).
    - `reverse_stock_movement(p_movement uuid, p_reason text) returns stock_movements` — sólo `manual_in`, `manual_out`, `adjustment` no anulados antes; inserta `reversal` con `quantity = -original`, `unit_cost = original.unit_cost`, `reverses_movement_id`. Otros tipos → “Este movimiento se corrige desde su compra u orden de producción”.
    - Núcleos `private.insert_movement(org, item, type, qty, unit_cost, reason, refs jsonb, actor, at)` usados por las RPC de Task 5, 6 y 8.
  - Vista `item_stock_status` (`security_invoker = true`): `item_id, organization_id, type, physical, committed` (Σ `planned_qty − consumed_qty` de `production_order_materials` en órdenes `planned`; hasta Task 6 la vista devuelve 0 y se redefine allí), `available = physical − committed`, `level` (`out` si físico ≤ 0, `low` si físico < `min_stock`, si no `ok`).

- [ ] **Step 1:** Tests de valorización (cada uno verifica `current_stock`, `avg_cost`, `unit_cost`, `balance_after`), usando `private.insert_movement` como `service` para las entradas de compra:
  - entrada 100 kg a $1.000 → stock 100, promedio 1.000; entrada 50 a $1.300 → promedio 1.100,0000.
  - salida manual 30 → costo 1.100, promedio sin cambio, stock 120.
  - salida que deja negativo → error con `faltan 30,000 kg` exacto; con `allow_negative_stock` → permitido.
  - ajuste a 0 y luego entrada a $2.000 → promedio 2.000 (stock en cero conserva el último promedio y no contamina).
  - `manual_in` sin costo → usa el promedio y no lo cambia; con costo → recalcula.
  - anulación de un `manual_in` con costo → vuelve al promedio anterior (±0,0001).
  - anular dos veces el mismo movimiento → error; anular un `purchase_receipt` con `reverse_stock_movement` → error con el mensaje indicado.
  - `update stock_movements` y `delete` como `service` → error del trigger.
  - Invariante: tras todos los casos, `current_stock = sum(quantity)` por ítem.
  - Aislamiento: usuario de B llama `create_stock_adjustment` con ítem de A → `42501`.
  - `item_stock_status.level`: `out`, `low`, `ok` según `min_stock`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Escribir la migración.
- [ ] **Step 4:** Run → PASS; `npm run test:db` verde.
- [ ] **Step 5:** Commit `feat(db): libro de stock con costo promedio, ajustes y anulaciones`.

### Task 5: Proveedores y compras

**Files:**
- Create: `supabase/migrations/20261118000400_purchasing.sql`, `supabase/tests/purchasing.test.ts`

**Interfaces:**
- Produces (SQL):
  - `suppliers` (§4.2, `status check in ('active','inactive')`), FK `items.preferred_supplier_id`.
  - `purchase_orders(code unique por org, supplier_id, status check in ('draft','pending','partially_received','received','closed','cancelled') default 'draft', order_date date, expected_date date, notes, subtotal, tax_total, total, cancel_reason)`; `purchase_order_lines(purchase_order_id cascade, item_id (raw_material), quantity > 0, unit_price ≥ 0, tax_rate check in (0, 10.5, 21, 27), received_qty default 0)`; `purchase_receipts(purchase_order_id, received_at date, delivery_note_number, notes)`; `purchase_receipt_lines(receipt_id, purchase_order_line_id, quantity > 0, reversed_qty default 0)`. FK `stock_movements.purchase_receipt_line_id`.
  - El código `OC-AAAA-NNNN` lo asigna un trigger `before insert` con `private.next_document_code`.
  - Trigger de totales: cualquier cambio en líneas recalcula `subtotal = Σ round(qty × price, 2)`, `tax_total = Σ round(qty × price × rate/100, 2)`, `total`.
  - RLS: líneas insertables/editables/borrables sólo si la orden está en `draft` (política con `exists`); cabecera editable (proveedor, fechas, notas) en `draft` y `pending`. `status`, `code`, totales y `received_qty` sin grant de update.
  - RPCs: `confirm_purchase_order(p_id)` (draft → pending; sin líneas → “Agregá al menos un material antes de confirmar”); `receive_purchase_order(p_id uuid, p_delivery_note text, p_received_at date, p_lines jsonb /* [{line_id, quantity}] */) returns purchase_receipts` (sólo `pending`/`partially_received`; cantidad ≤ pendiente → si no “No podés recibir más de lo pedido: quedan 40,000 kg de PEAD”; movimiento `purchase_receipt` al `unit_price` neto; actualiza `received_qty`, `items.last_purchase_cost`, estado `partially_received`/`received`); `reverse_purchase_receipt(p_receipt uuid, p_lines jsonb /* [{receipt_line_id, quantity}] */, p_reason text)` (movimientos `reversal` al costo original con `reverses_movement_id`, descuenta `received_qty`, suma `reversed_qty`, recalcula estado salvo `closed`/`cancelled`); `cancel_purchase_order(p_id, p_reason)` (draft/pending sin recepciones → `cancelled`; `partially_received` → `closed`; otros → error).
  - Todas bloquean la orden `for update` y escriben `activity_log` (“Recibió OC-2026-0017 (remito 0001-00004567)”).

- [ ] **Step 1:** Tests: totales con IVA mixto (21 % y 10,5 %) exactos al centavo; editar líneas de una orden `pending` → RLS lo impide; confirmar sin líneas → mensaje; recepción parcial → estado `partially_received`, stock y promedio actualizados, `last_purchase_cost`; recibir el resto → `received`; recibir de más → mensaje exacto; **doble envío**: dos recepciones del total → la segunda falla; anulación parcial de una recepción → stock, promedio y estado vuelven atrás (`partially_received`); anular más de lo recibido → error; cancelar parcialmente recibida → `closed`; usuario de B no puede recibir una orden de A (`42501`); `update purchase_orders set status='received'` → `permission denied`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** migración. **Step 4:** Run → PASS; `npm run test:db` verde.
- [ ] **Step 5:** Commit `feat(db): proveedores y compras con recepción parcial y anulaciones`.

### Task 6: Empleados y producción

**Files:**
- Create: `supabase/migrations/20261118000500_production.sql`, `supabase/tests/production.test.ts`

**Interfaces:**
- Produces (SQL):
  - `areas(name)`, `employees` (§4.2; `status check in ('active','on_leave','inactive')`, `hourly_cost numeric(14,2) null`, `user_id null`).
  - `production_orders` (§4.2; `status` default `planned`, `priority check in ('low','normal','high','urgent') default 'normal'`, `planned_qty > 0`, `good_qty`, `defective_qty`, `planned_material_cost`, `planned_labor_cost`, `planned_overhead_cost`, `actual_material_cost`, `actual_labor_cost`, `actual_overhead_cost`, `actual_unit_cost null`); `production_order_materials(item_id, qty_per_unit, waste_pct, planned_qty, consumed_qty default 0, cost_consumed default 0, returned_qty default 0, scrap_qty default 0)`; `production_order_assignments(employee_id, role_in_order check in ('responsable','operario','calidad'), hours_worked numeric(8,2) default 0, unique(order, employee))`; `production_reports(report_date date, good_qty ≥ 0, defective_qty ≥ 0, employee_id, notes)`; `production_order_events(from_status, to_status, note, actor_id, occurred_at)` inmutable. FK `stock_movements.production_order_id`.
  - Edición directa (admin, sólo en `planned`/`in_progress`/`quality_check`): `priority`, fechas planificadas, `notes`, `responsible_employee_id`; asignaciones insert/delete. Todo lo demás por RPC.
  - RPCs públicas = `require_role` + núcleo `private.*_core(..., p_actor uuid, p_at timestamptz)`:
    - `create_production_order(p_item uuid, p_planned_qty numeric, p_planned_start date, p_planned_end date, p_priority text, p_responsible uuid, p_employee_ids uuid[], p_notes text) returns production_orders` — exige receta con al menos una línea (“El producto no tiene receta: cargala antes de planificar”), copia materiales con `private.bom_requirement` (waste de la línea, si no de la receta, si no de la organización), costo planificado: material Σ `planned_qty × avg_cost`, mano de obra `planned_qty × standard_labor_minutes/60 × default_labor_rate`, indirectos `planned_qty × overhead_per_unit`. Evento `null → planned`.
    - `start_production_order(p_id)` — planned → in_progress; verifica todos los materiales primero y, si falta alguno, lanza un único error que los lista (“No hay stock suficiente para iniciar: PEAD faltan 57,500 kg; Masterbatch azul faltan 0,150 kg”); consume `planned_qty` de cada uno (`production_consumption`), guarda `consumed_qty`, `cost_consumed`.
    - `report_production_progress(p_id, p_good numeric, p_defective numeric, p_employee uuid, p_report_date date, p_notes text)` — sólo `in_progress`; suma a `good_qty`/`defective_qty`; evento con nota “Parte de avance: 120 buenas, 3 defectuosas”.
    - `send_to_quality_check(p_id)` y `return_to_production(p_id, p_note)` (nota obligatoria).
    - `complete_production_order(p_id, p_good numeric, p_defective numeric, p_consumptions jsonb /* [{item_id, quantity}] real total por material */, p_hours jsonb /* [{employee_id, hours}] */, p_note text)` — sólo `quality_check`. Por material: `diff = real − consumed_qty`; `diff < 0` → `production_return` de `−diff` al costo unitario consumido (`cost_consumed / consumed_qty`); `diff > 0` → `production_scrap` de `diff` al promedio. Costo real material = Σ valor neto; mano de obra Σ `hours × coalesce(hourly_cost, default_labor_rate)`; indirectos `good × overhead_per_unit`; `actual_unit_cost = total / good` si `good > 0` → `production_output` de `good` a ese costo. Si `good = 0`, sin ingreso. Si las cantidades difieren de la suma de partes, el evento lo registra (“Calidad reclasificó 5 unidades como defectuosas”).
    - `cancel_production_order(p_id, p_reason text, p_returns jsonb /* [{item_id, quantity}] */)` — desde `planned`: sin stock. Desde `in_progress`/`quality_check`: devoluciones ≤ consumido → `production_return` al costo consumido; el resto queda en `scrap_qty` del material (no genera otro movimiento: ya salió del stock al iniciar).
    - `create_purchase_from_shortages(p_order uuid, p_supplier uuid) returns purchase_orders` — borrador con una línea por material cuyo requerido supera el disponible (`item_stock_status.available` sin contar esta orden), `unit_price = coalesce(last_purchase_cost, avg_cost)`, IVA 21; sin faltantes → “Esta orden no tiene faltantes de material”.
  - Todas bloquean la orden `for update`, validan el estado esperado (si no: “La orden OP-2026-0042 ya no está planificada”), escriben evento y `activity_log`.
  - Redefine `item_stock_status.committed`. Vista `production_order_overview` (`security_invoker`): columnas de la orden + `item_name`, `item_sku`, `progress_pct = least(100, round(good / planned × 100))`, `is_delayed = planned_end_date < (now() at time zone org.timezone)::date and status in ('planned','in_progress','quality_check')`.

- [ ] **Step 1:** Tests (escenario: PEAD 300 kg a $1.000, masterbatch 2 kg a $8.000, producto Bidón con receta 0,250 kg + 0,005 kg, desperdicio 3 %, 15 min estándar, costo hora $6.000, indirectos $20):
  - crear 1.000 u → materiales 257,500 kg y 5,150 kg; costo planificado material = 257,5×1.000 + 5,15×8.000 = $298.700,00; mano de obra $1.500.000,00; indirectos $20.000,00. `committed` de PEAD = 257,500 y `available` = 42,500.
  - crear sin receta → mensaje exacto.
  - iniciar con faltante (bajar stock de masterbatch a 5 kg) → mensaje que lista sólo masterbatch con `faltan 0,150 kg`; nada se consumió (stock intacto).
  - iniciar ok → stock PEAD 42,500; **iniciar dos veces** → “ya no está planificada”.
  - parte de avance en `planned` → error; en `in_progress` suma.
  - completar con consumo real PEAD 250 (devuelve 7,5 a $1.000) y masterbatch 5,4 (exceso 0,25 al promedio) y 980 buenas / 20 defectuosas, 40 h de un empleado a $6.000 → `production_output` 980 u al costo esperado (calculado en el test a mano y comparado al centavo), estado `completed`, eventos completos.
  - completar con 0 buenas → sin `production_output`, `actual_unit_cost` nulo.
  - cancelar en producción devolviendo 100 kg de PEAD → `production_return` 100 kg, `scrap_qty` = consumido − 100, stock correcto.
  - `create_purchase_from_shortages` → borrador con la línea de masterbatch faltante.
  - usuario de B: `start_production_order` de una orden de A → `42501`.
  - `production_order_overview.is_delayed` true con fecha fin ayer y estado `planned`; false si `completed`.
  - Invariante global: stock = Σ movimientos para todos los ítems al final.
- [ ] **Step 2:** Run → FAIL. **Step 3:** migración. **Step 4:** Run → PASS; `npm run test:db` verde.
- [ ] **Step 5:** Commit `feat(db): empleados y ciclo completo de órdenes de producción`.

### Task 7: Storage y solicitudes de demostración

**Files:**
- Create: `supabase/migrations/20261118000600_storage_and_leads.sql`, `supabase/tests/storage-leads.test.ts`

**Interfaces:**
- Produces (SQL):
  - Buckets privados `item-images` y `employee-photos` (`file_size_limit 2097152`, `allowed_mime_types {image/webp,image/png,image/jpeg}`). Políticas en `storage.objects`: select para miembros y insert/update/delete para admin, ambos sobre la organización del primer segmento de la ruta (`private.uuid_or_null((storage.foldername(name))[1])`).
  - `demo_requests(id, name, company, email, phone, industry, message, ip_hash text, created_at)`. Sin grants para `anon` ni `authenticated` **[desvío del spec, más estricto: ver Ruling R1]**.
  - `public.submit_demo_request(p_name, p_company, p_email, p_phone, p_industry, p_message, p_ip_hash) returns void` sólo `service_role`: rechaza si ese `ip_hash` ya envió 3 en la última hora o si hubo 50 en total en la última hora (“Recibimos varias solicitudes desde tu conexión. Probá de nuevo en un rato.”).

- [ ] **Step 1:** Tests: miembro de A lee `A/xxx.webp`, no lee `B/xxx.webp`; ruta con primer segmento no uuid → denegado sin error de cast; `anon` no puede insertar en `demo_requests` ni ejecutar `submit_demo_request`; `service` envía 3 → ok, 4.º del mismo `ip_hash` → mensaje exacto.
- [ ] **Step 2:** Run → FAIL. **Step 3:** migración. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(db): buckets privados y solicitudes de demostración con límite`.

### Task 8: Datos de demostración

**Files:**
- Create: `supabase/migrations/20261118000700_demo.sql`, `supabase/tests/demo.test.ts`

**Interfaces:**
- Produces (SQL):
  - `private.seed_demo(p_org uuid, p_actor uuid)` — determinística (`setseed(0.42)`), sin `now()` salvo como ancla (`today` = fecha actual en la zona de la fábrica):
    - Catálogo de §8 del spec: 14 materias primas (PEAD, PEBD, PP homopolímero, PP copolímero, PET, masterbatch azul, blanco, rojo, negro, etiquetas, asas metálicas, precintos, cajas de embalaje, film stretch) con costos realistas en ARS; 12 productos terminados con receta, minutos estándar e indirectos; categorías; 5 proveedores; 7 áreas; 16 empleados con costo hora.
    - **Simulación día por día** desde `today − 180` hasta `today`, llamando sólo a los núcleos `private.*_core` con `p_at` = ese día y una hora del turno: compras (crear, confirmar, recibir en 1 o 2 entregas, alguna cerrada con faltantes y alguna cancelada), producción (crear ~60 órdenes con prioridades variadas; iniciar si hay stock, si no generar compra de faltantes; partes de avance diarios; calidad; completar con consumo real ±4 % y 0–3 % defectuosas; 2–3 canceladas), salidas manuales semanales de producto terminado (“Despacho a cliente”) para que el stock no crezca sin límite. Al final quedan órdenes en todos los estados, ≥ 3 demoradas, y ≥ 3 ítems bajo el mínimo (se fijan `min_stock` para que así sea).
    - Verificación final: si algún ítem tiene `current_stock <> Σ quantity` → excepción (la transacción completa se revierte).
  - `public.admin_create_demo_organization(p_user uuid) returns uuid` (sólo `service_role`): crea “Plásticos del Litoral S.A.” `is_demo`, membresía admin del usuario, ejecuta la semilla.
  - `public.reset_demo_organization(p_org uuid) returns void` (admin de esa organización y `is_demo = true`; si no, “Sólo las organizaciones demo se pueden restablecer”): guarda las membresías, `set local fabril.purge = 'on'`, borra la organización en cascada, la recrea con el mismo id, restaura membresías y vuelve a sembrar.

- [ ] **Step 1:** Tests (un solo seed por archivo, compartido): rangos de cantidades (12 productos, 14 materias primas, 30–40 OC, 55–65 OP); todos los estados de compra y producción presentes; `is_delayed` ≥ 3; ítems bajo mínimo ≥ 3; stock = Σ movimientos para todos los ítems; ningún `current_stock` negativo; ningún movimiento con fecha futura; **determinismo**: dos seeds en organizaciones distintas producen los mismos conteos y el mismo valor total de inventario; `reset_demo_organization` por un admin de una organización no demo → mensaje exacto; reset de la demo conserva el id y las membresías; la organización real del mismo usuario no cambia en nada tras crear y resetear la demo.
- [ ] **Step 2:** Run → FAIL. **Step 3:** migración. **Step 4:** Run → PASS; `npm run test:db` verde (registrar duración: objetivo < 60 s el archivo de demo).
- [ ] **Step 5:** Commit `feat(db): organización demo generada con las mismas reglas de negocio`.

### Task 9: Clientes de Supabase, proxy y capa de acceso

**Files:**
- Create: `src/lib/env.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/admin.ts`, `src/lib/supabase/proxy.ts`, `src/proxy.ts`, `src/lib/auth/types.ts`, `src/lib/auth/session.ts`, `src/lib/auth/permissions.ts`, `src/lib/auth/redirect.ts`, `src/lib/actions.ts`, `src/types/database.ts` (provisorio escrito a mano para las tablas de este Task; se reemplaza por el generado en Task 12), tests `src/lib/env.test.ts`, `src/lib/auth/redirect.test.ts`, `src/lib/auth/session.test.ts`, `src/lib/actions.test.ts`

**Interfaces:**
- Produces:
  - `publicEnv: { supabaseUrl: string; supabaseKey: string; siteUrl: string }` (Zod; error claro si falta: “Falta NEXT_PUBLIC_SUPABASE_URL en .env.local”); `serverEnv(): { secretKey: string }` en módulo `server-only`.
  - `createClient(): Promise<SupabaseClient<Database>>` (servidor, cookies `getAll`/`setAll`), `createBrowserClient()`, `createAdminClient()` (`server-only`, `persistSession: false`).
  - `updateSession(request: NextRequest): Promise<NextResponse>` — refresca con `supabase.auth.getClaims()`; sin usuario y ruta `/app/*` → redirect `/ingresar?next=<ruta>`; con usuario en `/ingresar` o `/recuperar` → `/app`. `src/proxy.ts` con `matcher` que excluye `_next`, estáticos e imágenes.
  - `safeNextPath(raw: string | null | undefined, fallback = "/app"): string` — acepta sólo rutas que empiezan con `/app` o `/restablecer`, sin `//`, sin `\`, sin esquema.
  - `AppSession` (mueve el tipo desde `src/fixtures/session.ts`): `{ user: { id; name; email }; organizations: { id; name; isDemo; role: "admin" }[]; activeOrganizationId: string; role: "admin" }`.
  - `resolveActiveOrganization(memberships, cookieValue, lastOrgId): string | null` (puro: cookie válida → esa; si no `lastOrgId` válido; si no la primera por nombre).
  - `getSession(): Promise<AppSession | null>` (`cache` de React; claims → perfil + membresías activas + organizaciones; cookie `fabril_org`). `requireSession(): Promise<AppSession>` (sin usuario → `redirect("/ingresar")`; sin fábricas → `redirect("/sin-acceso")`).
  - `PERMISSIONS` y `can(session, permission)`; v1 todo `admin`.
  - `createAction<S extends z.ZodType, R>({ schema, permission?, handler: (input, ctx: { session, orgId, supabase }) => Promise<R> }): (input: unknown) => Promise<ActionResult<R>>`; `ActionResult<R> = { ok: true; data: R } | { ok: false; error: string; fieldErrors?: Record<string, string[]> }`.
  - `mapDbError(error: { code?: string; message: string }): string` — `P0001` → el mensaje tal cual; `42501` → “No tenés permiso para hacer esto en esta fábrica”; `23505` → “Ya existe un registro con ese dato (por ejemplo, el mismo SKU)”; `23503` → “No se puede completar porque está vinculado a otros registros”; red/otros → “No pudimos completar la operación. Probá de nuevo.” (nunca expone SQL).

- [ ] **Step 1:** Tests: `safeNextPath` con `"/app/productos"` → igual; `"https://evil.com"`, `"//evil.com"`, `"/\\evil.com"`, `"/appevil"` y `null` → `/app` (sólo se acepta exactamente `/app`, algo que empiece con `/app/` o `/restablecer`); `resolveActiveOrganization` (cookie de una fábrica a la que no pertenece → se ignora); `mapDbError` cada código; `createAction` devuelve `fieldErrors` con input inválido sin llamar al handler, y `{ ok:false, error }` mapeado cuando el handler lanza un error de Postgres; `publicEnv` con variable faltante → mensaje.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementar. **Step 4:** Run → PASS; `npm run typecheck` ok.
- [ ] **Step 5:** Commit `feat(auth): clientes de Supabase, proxy de sesión y capa de acceso`.

### Task 10: Flujos de autenticación y panel con sesión real

**Files:**
- Create: `src/features/auth/actions.ts`, `src/app/auth/confirm/route.ts`, `src/app/(auth)/sin-acceso/page.tsx`, `src/features/organizations/actions.ts`, `src/components/layout/app-shell.tsx`, `src/components/layout/shell-skeleton.tsx`
- Modify: `src/features/auth/components/login-form.tsx`, `recover-form.tsx`, `reset-form.tsx`, `src/app/(auth)/restablecer/page.tsx`, `src/app/app/layout.tsx`, `src/components/layout/org-switcher.tsx`, `src/components/layout/user-menu.tsx`, componentes que importan `AppSession` desde `@/fixtures/session`
- Delete: `src/fixtures/session.ts`
- Test: `src/features/auth/components/login-form.test.tsx` (ampliar), `recover-form.test.tsx`, `reset-form.test.tsx`, `src/components/layout/org-switcher.test.tsx`

**Interfaces:**
- Consumes: Task 9 (`createAction`, `safeNextPath`, `requireSession`, `createClient`).
- Produces:
  - `signIn(input: LoginValues & { next?: string })` → `signInWithPassword`; error de credenciales → “El email o la contraseña no son correctos”; éxito → `redirect(safeNextPath(next))`.
  - `requestPasswordReset(input: RecoverValues)` → `resetPasswordForEmail(email, { redirectTo: siteUrl + "/auth/confirm?next=/restablecer" })`; responde siempre lo mismo (“Si el email está registrado, te enviamos un enlace…”), incluso si el email no existe.
  - `updatePassword(input: ResetPasswordValues)` → exige sesión (si no: “El enlace venció o ya se usó. Pedí uno nuevo.”), `updateUser({ password })`, `redirect("/app")`.
  - `signOut()` → `redirect("/ingresar")`.
  - `GET /auth/confirm`: con `token_hash` + `type` (`invite`, `recovery`, `email`) → `verifyOtp`; con `code` → `exchangeCodeForSession`; éxito → `safeNextPath(next)`; error → `/ingresar?error=enlace`, y `/ingresar` muestra “El enlace venció o ya se usó.”.
  - `switchOrganization(orgId: string)` → valida membresía, cookie `fabril_org` (httpOnly, `sameSite=lax`, 1 año), `profiles.last_organization_id`, `revalidatePath("/app", "layout")`.
  - Layout `/app`: shell estático + `<Suspense fallback={<ShellSkeleton/>}><AppShell>{children}</AppShell></Suspense>`; `AppShell` llama a `requireSession()` (regla de `cacheComponents`: lecturas de cookies dentro de un límite de Suspense).
  - `/restablecer` sin sesión muestra el estado “El enlace venció” con botón a `/recuperar`; con sesión de invitación muestra “Elegí tu contraseña para entrar a <fábrica>”.

- [ ] **Step 1:** Tests de componentes (acciones mockeadas con `vi.mock("@/features/auth/actions")`): login con error del servidor muestra el mensaje en un `role="alert"` y mantiene el email; recover muestra el mensaje neutro tras enviar; reset muestra errores de Zod y llama a `updatePassword` con valores válidos; `OrgSwitcher` llama a `switchOrganization` con el id elegido y marca la activa.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementar. **Step 4:** Run → PASS; `npm run typecheck && npm run lint && npm run build` ok.
- [ ] **Step 5:** Commit `feat(auth): ingreso, recuperación, invitaciones y organización activa`.

### Task 11: Usuarios de la fábrica y formulario de la landing

**Files:**
- Create: `src/features/members/schemas.ts`, `src/features/members/actions.ts`, `src/features/members/queries.ts`, `src/features/members/components/members-panel.tsx`, `src/features/members/components/invite-dialog.tsx`, `src/features/marketing/actions.ts`, `src/lib/request-ip.ts`
- Modify: `src/app/app/configuracion/page.tsx`, `src/features/marketing/components/demo-request-form.tsx`
- Test: `src/features/members/schemas.test.ts`, `src/features/members/components/invite-dialog.test.tsx`, `src/features/marketing/components/demo-request-form.test.tsx`, `src/lib/request-ip.test.ts`

**Interfaces:**
- Produces:
  - `listMembers(orgId)` (server-only): membresías + perfiles; estado “Pendiente” si el usuario nunca ingresó (`auth.admin.getUserById` → `last_sign_in_at` nulo), “Activo”, “Deshabilitado”.
  - `inviteMember({ email, fullName })` (admin; organización no demo → si es demo: “Las organizaciones demo no admiten invitaciones”): usuario nuevo → `auth.admin.generateLink({ type: "invite", email, data: { full_name } })`; usuario existente → sin enlace; en ambos casos inserta la membresía con el cliente admin **después** de verificar `has_role` con el cliente del usuario. Devuelve `{ inviteUrl: string | null }` con `siteUrl/auth/confirm?token_hash=…&type=invite&next=/restablecer`, que la UI muestra con botón “Copiar enlace” (válido 24 h) **[ver Ruling R2]**.
  - `setMemberStatus({ userId, status })` → update vía RLS (el trigger protege al último admin; el mensaje llega por `mapDbError`).
  - `submitDemoRequest(values)` → valida con `demoRequestSchema`; honeypot completo → responde éxito sin guardar; `ip_hash = sha256(ip + secretKey)`; llama `submit_demo_request` con el cliente admin.
  - `clientIp(headers: Headers): string` — primer valor de `x-forwarded-for`, si no `x-real-ip`, si no `"unknown"`.
- Configuración muestra la sección “Usuarios” (tabla de miembros, invitar, deshabilitar/habilitar con `ConfirmDialog`). El resto de Configuración sigue para la Etapa 4.

- [ ] **Step 1:** Tests: esquema de invitación (email inválido, nombre vacío); `InviteDialog` muestra el enlace y lo copia (`navigator.clipboard.writeText` mock) tras una invitación exitosa, y el error en `role="alert"` si falla; formulario de demo muestra el mensaje de éxito real y el error de límite; `clientIp` con `"1.2.3.4, 10.0.0.1"` → `"1.2.3.4"`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementar. **Step 4:** Run → PASS; typecheck, lint, build ok.
- [ ] **Step 5:** Commit `feat: usuarios de la fábrica por invitación y solicitudes de demo reales`.

### Task 12: Nube — migraciones, configuración de Auth, scripts y verificación real

**Files:**
- Create: `scripts/lib/env.ts`, `scripts/db.ts`, `scripts/auth-config.ts`, `scripts/fabrica-crear.ts`, `scripts/demo-crear.ts`, `scripts/verify-cloud.ts`, `scripts/lib/auth-config.test.ts`
- Modify: `package.json` (scripts), `src/types/database.ts` (generado), `README.md` (sección Supabase), `docs/plan-tecnico.md` (§4/§8/§9 con los desvíos aprobados)

**Interfaces:**
- Produces (npm scripts, todos con `node --env-file=.env.local`):
  - `db:push` → `supabase link --project-ref $SUPABASE_PROJECT_REF` + `supabase db push` (con `SUPABASE_ACCESS_TOKEN` y `SUPABASE_DB_PASSWORD` del entorno; nunca impresos).
  - `db:types` → `supabase gen types typescript --project-id $SUPABASE_PROJECT_REF --schema public > src/types/database.ts`.
  - `auth:config` → `PATCH https://api.supabase.com/v1/projects/{ref}/config/auth` con `buildAuthConfig(siteUrl)` (puro, testeado): `disable_signup: true`, `site_url`, `uri_allow_list: "<site>/auth/confirm**"`, `password_min_length: 8`, asuntos de email en español.
  - `fabrica:crear -- --nombre "…" --email "…"` → crea o reutiliza el usuario (enlace de invitación si es nuevo), `admin_create_organization`, imprime la fábrica creada y el enlace.
  - `demo:crear -- --email "…"` → el usuario debe existir (si no: mensaje con el comando `fabrica:crear`), `admin_create_demo_organization`, imprime conteos.
  - `db:verify` → `verify-cloud.ts`: crea dos fábricas temporales y dos usuarios con contraseña aleatoria, inicia sesión con la clave publicable, comprueba que cada uno lee sólo lo suyo (organizations, items, stock_movements, memberships), que escribir con el `organization_id` ajeno falla, que una RPC ajena da `42501`, que `anon` no lee nada y que `signUp` público está desactivado; borra todo al terminar (también si falla) e imprime una tabla de resultados.
  - Al final: *security advisor* (`GET /v1/projects/{ref}/advisors/security`) sin hallazgos de nivel ERROR.

- [ ] **Step 1:** Test `buildAuthConfig("https://fabril.app")` → objeto exacto esperado (incluye `disable_signup: true`).
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementar scripts. **Step 4:** Run → PASS.
- [ ] **Step 5:** **Requiere `.env.local` completo.** `npm run db:push` → migraciones aplicadas; `npm run db:types` → reemplaza el tipo provisorio; `npm run typecheck` ok; `npm run auth:config`; `npm run db:verify` → todas las comprobaciones en verde; security advisor sin errores.
- [ ] **Step 6:** `npm run fabrica:crear` con el email del dueño del producto y `npm run demo:crear` con el mismo email. Ingreso real en `http://localhost:3000/ingresar`, cambio entre la fábrica y la demo, cierre de sesión (verificación con Playwright y capturas).
- [ ] **Step 7:** README: cómo completar `.env.local`, aplicar migraciones, crear la fábrica y la demo, limitación del email por defecto de Supabase (sólo envía a direcciones del equipo y con límite por hora: para producción configurar SMTP propio). Commit `feat: migraciones en la nube, scripts de alta y verificación de aislamiento`.

---

## Rulings de planificación (a confirmar con el dueño del producto al presentar el plan)

- **R1 — `demo_requests` sin acceso anónimo.** El spec dice “anon sólo puede insertar”. El plan lo hace más estricto: nadie desde el navegador accede a la tabla; la Server Action valida, aplica el campo trampa y llama a una función sólo para el servidor que limita por IP de forma atómica. Motivo: con insert anónimo cualquiera podría cargar filas directo por la API saltándose el límite. Costo si no se quiere: una política y un grant.
- **R2 — Invitaciones con enlace para copiar.** El spec dice invitar por email (`inviteUserByEmail`). El email incluido en Supabase sólo llega a direcciones del equipo del proyecto y tiene un límite bajo por hora, así que un cliente real no recibiría la invitación hasta configurar un SMTP propio. v1: la invitación genera un enlace de 24 h que el admin copia y manda por WhatsApp o email; cuando haya SMTP propio se suma el envío automático sin cambiar el resto. La recuperación de contraseña sí usa email (funciona para las direcciones del equipo; para clientes reales requiere SMTP propio, documentado en el README).
- **R3 — Membresías sin estado “invitada”.** Estados `active|disabled`; “Pendiente” se deriva de si el usuario nunca ingresó. Evita un estado que habría que sincronizar a mano.
- **R4 — Vistas de costos y funciones de reportes pasan a la Etapa 4** (`item_standard_cost`, `production_order_costs`, `report_*`): su forma la define la pantalla de Costos y Reportes. En esta etapa quedan las vistas que usa el núcleo (`item_stock_status`, `production_order_overview`).
- **R5 — Cancelar una orden en producción no genera movimiento de merma** para el material no devuelto: ya salió del stock al iniciar; registrarlo otra vez lo descontaría dos veces. Queda como `scrap_qty` del material de la orden (visible en desperdicio y costos).
- **R6 — Rol `admin` único en el enum** (`app_role`): sumar roles es `alter type ... add value`, sin tocar políticas (todas pasan por `has_role`).
