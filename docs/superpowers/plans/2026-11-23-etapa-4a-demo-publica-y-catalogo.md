# Etapa 4 · Bloque 4A — Demo pública, Dashboard, Catálogo e Inventario · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cualquiera entre a una demo de FABRIL sin cuenta (solo lectura, aplicada en la base) y recorra Dashboard, Productos, Materias primas (con recetas), Inventario y Configuración con datos reales; el dueño usa lo mismo con escritura.

**Architecture:** Un único flag persistente (`organizations.is_public_demo`) habilita lectura para el rol `anon` **solo** de esa fábrica mediante políticas RLS; no existe ninguna política ni RPC de escritura para `anon`. "Probar la demo" (`/demo`) pone una cookie-bandera (`fabril_demo`, no es una credencial) y redirige a `/app`: las mismas pantallas y los mismos links funcionan sin duplicar rutas; `requireSession()` devuelve una sesión de modo `demo` con `role: null`, y `can()` ya devuelve `false` para `null`. Los agregados (dashboard, costos) viven en SQL; las escrituras usan las RPC/tablas existentes bajo RLS.

**Tech Stack:** Next.js 16.4.5 (App Router, `cacheComponents`, `proxy.ts`), TypeScript, Supabase (`@supabase/ssr`, PostgREST, RLS), PGlite para tests SQL, Vitest + Testing Library, Zod 4, React Hook Form, Recharts, shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-11-22-etapa-4-design.md` (secciones 5.1–5.8, 5.12, 5.13). El bloque 4B (Compras, Producción, buscador/alertas, capturas) tiene su propio plan.

## Global Constraints

- Leer la guía correspondiente en `node_modules/next/dist/docs/` antes de escribir código de Next (AGENTS.md: esta versión tiene cambios incompatibles). Lecturas de `cookies()`/`headers()`/`searchParams` van dentro de `<Suspense>` (Cache Components).
- UI en español rioplatense con formato argentino (`src/lib/format.ts`: `formatCurrency`, `formatQuantity`, `formatDate`).
- Sin claves privadas en el frontend; la clave secreta (`createAdminClient`) solo en servidor y **nunca** en la demo. Lógica crítica en la base (RPC/RLS), no solo en la interfaz.
- No modificar migraciones ya aplicadas: todo cambio de esquema va en migraciones nuevas, que repiten al final el patrón `revoke execute on all functions in schema private from public, anon, authenticated; grant execute on function private.user_org_ids(), private.user_admin_org_ids(), private.colleague_ids(), private.is_draft_purchase(uuid), private.is_active_production(uuid), private.uuid_or_null(text) to authenticated;` (más los helpers nuevos que correspondan).
- Supabase en la nube rechaza `UPDATE`/`DELETE` sin `WHERE` (incluso en funciones): usar `where true` si hace falta; `supabase/tests/safeupdate.test.ts` lo vigila. Verificar cada migración **también contra la nube** (`npm run db:push`), porque PGlite no replica todo.
- Datos demo separados de los reales (`organizations.is_demo`); la demo pública es una organización con `is_demo = true`.
- `manual_cost` no se muestra en la interfaz. El "costo estándar" replica la fórmula de `create_production_order_core` (ver Task 8).
- Menú final: Inicio · Producción · Inventario · Productos · Materias primas · Compras · Configuración (Configuración no existe en modo demo). Se eliminan Proveedores, Empleados, Costos y Reportes.
- Cada tarea termina con `npm test`, `npm run test:db`, `npm run typecheck` y `npm run lint` en verde, y un commit. Mensajes de commit en español con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` al final.
- Las claves/tokens no se piden por el chat: el usuario edita `.env.local`.

## Review Focus

1. **Dueño con la cookie de demo puesta**: si hay sesión real, manda la sesión real (modo `member`, con escritura), nunca el modo demo.
2. **`anon` pidiendo otra fábrica por id** (RPC `dashboard_data`, `recent_activity`, lecturas directas): devuelve vacío/nada, nunca datos de una fábrica no pública.
3. **Cookie de demo sin demo pública cargada** (script no corrido): redirige a `/ingresar?demo=no-disponible` con mensaje, sin bucle de redirecciones.
4. **Fábrica sin movimientos / demo vieja**: el Dashboard no muestra `NaN`, `Infinity` ni división por cero y los gráficos quedan vacíos con gracia.
5. **Búsqueda con caracteres de PostgREST** (`,` `(` `)` `*` `%` `\` en `q`) o parámetros de URL hostiles (`page=-1`, `sort=x`, `pageSize=9999`): no rompe la consulta ni agrega filtros ajenos.

---

## Estructura de archivos

**Base de datos (migraciones nuevas)**
- `supabase/migrations/20261123000100_public_demo.sql` — flag, helper, lectura anónima, `admin_set_public_demo`.
- `supabase/migrations/20261123000200_dashboard.sql` — `dashboard_data`, `recent_activity`.
- `supabase/migrations/20261123000300_catalog_rules.sql` — guardas (unidad, zona horaria), `save_bom`, vista `item_costing`.
- Tests: `supabase/tests/public-demo.test.ts`, `dashboard.test.ts`, `catalog-rules.test.ts`; se ajustan `foundation.test.ts` y `catalog.test.ts`.

**Acceso y sesión**
- `src/lib/auth/types.ts`, `session.ts`, `redirect.ts`, `permissions.ts` (modificados); `src/lib/auth/demo.ts` (nuevo); `src/lib/supabase/proxy.ts`, `src/proxy.ts`, `src/lib/actions.ts` (modificados).
- `src/app/demo/route.ts` (nuevo); `src/features/demo/actions.ts` (nuevo: `exitDemo`).
- `src/components/layout/access-provider.tsx`, `demo-banner.tsx` (nuevos); `src/components/forms/submit-button.tsx` (nuevo); `app-shell.tsx`, `topbar.tsx`, `user-menu.tsx`, `org-switcher.tsx`, `app-sidebar.tsx`/`mobile-nav.tsx`/`nav-list.tsx` (modificados); `src/lib/navigation.ts` (modificado).

**Funcionalidades**
- `src/features/dashboard/queries.ts` (nuevo) + `types.ts` (ampliado) + página `src/app/app/page.tsx`.
- `src/features/items/` (nuevo): `queries.ts`, `actions.ts`, `schemas.ts`, `bom-schemas.ts`, componentes de ficha y receta.
- `src/features/inventory/` (nuevo): `queries.ts`, `actions.ts`, `schemas.ts`, componentes.
- `src/features/settings/` (nuevo): `actions.ts`, `schemas.ts`, `components/general-form.tsx`, `demo-reset.tsx`.
- Páginas: `src/app/app/{productos,materias-primas}/page.tsx` y `[id]/page.tsx`, `src/app/app/inventario/{page,movimientos/page}.tsx`, `src/app/app/configuracion/page.tsx`.
- Landing: `hero.tsx`, `site-header.tsx`, `site-footer.tsx`, `demo-section.tsx`, `content.ts`.

---

### Task 1: Lectura anónima de la demo pública (base de datos)

**Files:**
- Create: `supabase/migrations/20261123000100_public_demo.sql`, `supabase/tests/public-demo.test.ts`
- Modify: `supabase/tests/foundation.test.ts:25-30`, `supabase/tests/catalog.test.ts:124-130`

**Interfaces:**
- Produces: columna `public.organizations.is_public_demo boolean not null default false`; `private.public_demo_org_id() returns uuid` (ejecutable por `anon` y `authenticated`); `public.admin_set_public_demo(p_org uuid) returns void` (solo `service_role`; exige `is_demo`; deja una única pública; idempotente).

- [ ] **Step 1: Escribir los tests en rojo** (`public-demo.test.ts`, mismo estilo que `catalog.test.ts` con `createTestDb`). Casos, con los valores exactos:
  - `anon` ve `organizations` solo si `is_public_demo` (con ninguna pública: `[]`; tras `admin_set_public_demo(demoA)`: solo `demoA`), y no puede seleccionar columnas privadas (`select cuit from public.organizations` → `permission denied`).
  - Con `demoA` pública y `orgB` normal con ítems: `anon` lee `items`, `categories`, `boms`, `bom_lines`, `stock_movements`, `activity_log`, `production_orders`, `purchase_orders`, `item_stock_status`, `production_order_overview`, `units` **solo de `demoA`**; cero filas de `orgB`. Hacerlo con un `for` sobre la lista de tablas.
  - `anon` no lee `memberships`, `profiles`, `document_sequences`, `demo_requests` (→ `permission denied`) ni `employees.email`/`hourly_cost`.
  - `anon` no puede `insert`/`update`/`delete` en `items`, `stock_movements`, `organizations`, y no puede ejecutar `create_manual_movement`, `create_stock_adjustment`, `reverse_stock_movement`, `reset_demo_organization`, `create_production_order` (→ `permission denied for function`).
  - Un `authenticated` ajeno (usuario de `orgB`) también ve `demoA` en lecturas, pero **no** puede escribirla (insertar un ítem en `demoA` → falla RLS).
  - `admin_set_public_demo`: rechaza una org no demo (`P0001`), mover la marca de `demoA` a `demoC` deja una sola `true`, no es ejecutable por `authenticated`/`anon`; `authenticated` no puede `update organizations set is_public_demo = true` (grant de columnas).
  - El archivo `safeupdate.test.ts` ya vigila `where` faltantes: no tocarlo.
- [ ] **Step 2: Verificar rojo:** `npx vitest run supabase/tests/public-demo.test.ts` → falla por columna/función inexistentes.
- [ ] **Step 3: Implementar la migración.**
  - `alter table public.organizations add column is_public_demo boolean not null default false`, `check (not is_public_demo or is_demo)` y `create unique index organizations_one_public_demo on public.organizations ((true)) where is_public_demo`. No agregarla al `grant update (...)` existente.
  - `private.public_demo_org_id()`: `language sql stable security definer set search_path = ''`, `select id from public.organizations where is_public_demo limit 1`. `grant usage on schema private to anon`; `grant execute` del helper a `anon, authenticated` (y agregarlo a la línea final de grants del patrón).
  - Lectura anónima: `grant select (id, name, is_demo, is_public_demo, timezone) on public.organizations to anon` y política `organizations_public_demo_select ... to anon using (id = (select private.public_demo_org_id()))`. Para `authenticated` agregar la misma política (se suma por OR a la existente).
  - Un bloque `do $$` sobre la lista `categories, items, boms, bom_lines, stock_movements, activity_log, suppliers, purchase_orders, purchase_order_lines, purchase_receipts, purchase_receipt_lines, areas, production_orders, production_order_materials, production_order_assignments, production_reports, production_order_events` que hace `grant select ... to anon` y crea `%1$s_public_demo_select ... to anon, authenticated using (organization_id = (select private.public_demo_org_id()))`. `employees`: `grant select (id, organization_id, first_name, last_name, position, area_id, status) to anon` + política equivalente (verificar los nombres de columnas en `20261118000500_production.sql`; `authenticated` mantiene su política actual y suma la pública). `units`: `grant select to anon` + política `using (true)`. Vistas `item_stock_status` y `production_order_overview`: `grant select ... to anon` (son `security_invoker`, el filtro lo ponen las tablas).
  - `admin_set_public_demo`: `security definer`, `revoke ... from public, anon, authenticated; grant ... to service_role`; valida `is_demo` (mensaje: "Sólo una organización demo puede ser pública"), `update public.organizations set is_public_demo = false where is_public_demo` y luego `... = true where id = p_org`.
  - Repetir al final el bloque de `revoke`/`grant` del patrón.
- [ ] **Step 4: Ajustar los dos tests existentes** que asumían "anon sin grants" (`foundation.test.ts` "anon no ve organizaciones" y `catalog.test.ts` "anon no ve nada"): ahora `anon` recibe `[]` cuando no hay demo pública (cambiar `rejects.toThrow` por `expect(rows).toEqual([])`), manteniendo el espíritu de la prueba.
- [ ] **Step 5: Verde:** `npm run test:db` completo → todo pasa, incluida `safeupdate`.
- [ ] **Step 6: Commit** `feat(db): lectura anónima de la demo pública (RLS) y admin_set_public_demo`.

---

### Task 2: Publicar la demo en la nube

**Files:**
- Create: `scripts/demo-publica.mts`
- Modify: `package.json` (script `demo:publica`), `scripts/verify-cloud.mts`, `README.md` (sección de scripts), `src/types/database.ts` (regenerado)

**Interfaces:**
- Consumes: `admin_set_public_demo`, `admin_create_demo_organization(p_user)`, `admin_find_user_by_email`, helpers de `scripts/lib/env.mts` y `scripts/lib/supabase.mts`.
- Produces: `npm run demo:publica -- --email <dueño>` (idempotente; si el dueño no tiene demo la crea; marca la suya como pública).

- [ ] **Step 1:** Escribir `scripts/demo-publica.mts` siguiendo el estilo de `scripts/demo-crear.mts` (argumentos, mensajes en español, `fail`). Si el dueño ya es miembro de una org con `is_demo`, usarla; si no, `admin_create_demo_organization`. Luego `admin_set_public_demo`. Imprimir nombre y id.
- [ ] **Step 2:** Agregar a `scripts/verify-cloud.mts` un chequeo (mismo formato que los existentes) con un cliente **con la clave pública**: lee la demo pública, no lee otra organización, y un `insert` en `items` falla. Agregar el script a `package.json` y documentarlo en `README.md`.
- [ ] **Step 3:** Aplicar a la nube: `npm run db:push` (confirmar que la migración 20261123000100 se aplica sin el error de `safeupdate`), `npm run db:types`, formatear `src/types/database.ts` con prettier (como en la Etapa 3), `npm run demo:publica -- --email <el email del dueño, tomado de `.env.local`/pedido al usuario si falta>` y `npm run db:verify` → todos los chequeos en verde.
- [ ] **Step 4:** `npm run typecheck && npm test && npm run test:db`. Commit `feat: demo:publica y chequeo de lectura anónima en la nube`.

---

### Task 3: Modelo de acceso — modo demo en la sesión, proxy y acciones

**Files:**
- Create: `src/lib/auth/demo.ts`, `src/app/demo/route.ts`, `src/features/demo/actions.ts`, tests junto a cada módulo (`src/lib/auth/redirect.test.ts` existente se amplía; `src/lib/auth/session.test.ts` nuevo si el módulo es testeable con mocks; `src/lib/auth/permissions.test.ts` se amplía)
- Modify: `src/lib/auth/types.ts`, `src/lib/auth/session.ts`, `src/lib/auth/redirect.ts`, `src/lib/supabase/proxy.ts`, `src/lib/actions.ts`, `src/app/(auth)/ingresar/page.tsx`

**Interfaces:**
- Produces:
  - `AppSession.role: AppRole | null` y nuevo `AppSession.mode: "member" | "demo"`.
  - `src/lib/auth/demo.ts`: `export const DEMO_COOKIE = "fabril_demo"`; `export function demoSession(org: { id: string; name: string }): AppSession` (pura: `user {id:"demo", name:"Visitante", email:""}`, una sola organización con `isDemo: true`, `role: null`, `mode: "demo"`); `export async function getPublicDemoOrganization(): Promise<{ id: string; name: string } | null>` (usa `createClient()` sin sesión → rol `anon`).
  - `routeDecision(pathname, search, isAuthenticated, demoMode = false)`: sin sesión pero con `demoMode` deja pasar `/app…` y `/ingresar`; con sesión real ignora `demoMode`.
  - `requireSession()`: sesión real → `member`; si no y existe la cookie `DEMO_COOKIE` → `demoSession(...)` (si no hay demo pública: `redirect("/ingresar?demo=no-disponible")`); si no → `redirect("/ingresar")`.
  - `getSession()` deja de caer en `admin` cuando no encuentra membresía (`role: active?.role ?? null`).
  - `createAction`: si `session.mode === "demo"` lanza `ActionError("No disponible en la demo")` antes de cualquier permiso.
  - `exitDemo: () => Promise<never>` (Server Action: borra la cookie y `redirect("/")`).

- [ ] **Step 1: Tests en rojo.** `routeDecision`: sin sesión + `/app/productos` + `demoMode=true` → `null`; sin sesión + `/app` sin demo → `/ingresar?next=…`; con sesión + `demoMode=true` → igual que sin demo (`/ingresar` redirige a `/app`); `/ingresar` con demo y sin sesión → `null`. `can(null, "manageCatalog")` es `false` para todos los permisos. `demoSession(org)` devuelve `role: null`, `mode: "demo"` y una única organización. `createAction` con sesión demo devuelve `{ ok: false, error: "No disponible en la demo" }` sin ejecutar el handler (con `vi.mock("@/lib/auth/session")` devolviendo una sesión demo; ver `src/lib/action-core.test.ts` si existe para el patrón de `runAction`).
- [ ] **Step 2: Verificar rojo** (`npx vitest run src/lib`).
- [ ] **Step 3: Implementar** lo anterior. `proxy.ts` lee `request.cookies.get(DEMO_COOKIE)` y se lo pasa a `routeDecision`. `src/app/demo/route.ts` (`GET`): `getPublicDemoOrganization()`; si existe, `cookies().set(DEMO_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60*60*24*7 })` y `redirect("/app")`; si no, `redirect("/ingresar?demo=no-disponible")`. `ingresar/page.tsx`: si `searchParams.demo === "no-disponible"`, mostrar `FormAlert` ("La demo no está disponible por ahora"). Leer antes la guía de Route Handlers y `cookies()` de `node_modules/next/dist/docs/`.
- [ ] **Step 4: Verde** y `npm run typecheck` (cambiar `role` a `AppRole | null` rompe usos: corregirlos sin cambiar comportamiento). Commit `feat: modo demo en la sesión, proxy y acciones`.

---

### Task 4: Interfaz del modo demo (franja, menú, navegación, botones bloqueados)

**Files:**
- Create: `src/components/layout/access-provider.tsx`, `src/components/layout/demo-banner.tsx`, `src/components/forms/submit-button.tsx`, tests de cada uno
- Modify: `src/components/layout/{app-shell,topbar,user-menu,org-switcher,app-sidebar,mobile-nav,nav-list}.tsx`, `src/lib/navigation.ts` (+ su test)
- Delete: `src/app/app/{proveedores,empleados,costos,reportes}/page.tsx`

**Interfaces:**
- Produces:
  - `AccessProvider({ role, mode, children })` y `useAccess(): { mode: "member" | "demo"; role: AppRole | null; can: (p: Permission) => boolean }` (client).
  - `SubmitButton({ permission, pending, children, ...ButtonProps })`: deshabilitado cuando `!can(permission)`; en modo demo muestra "No disponible en la demo" (con `title`/tooltip) en lugar de `children`; mientras `pending` muestra el estado de carga ya usado en los formularios.
  - `navItemsFor(mode: "member" | "demo")`: `NAV_ITEMS` sin Proveedores/Empleados/Costos/Reportes; sin Configuración en modo demo. `groupedNavItems(mode)` la usa.
  - `DemoBanner`: franja fija "Estás viendo una demo de solo lectura de FABRIL · Los cambios no se guardan" + enlace "Volver al sitio" (`/`).

- [ ] **Step 1: Tests en rojo.** `navigation`: en `demo` no aparece Configuración; en ninguno aparecen los cuatro ítems eliminados; el orden es Inicio, Producción, Inventario, Productos, Materias primas, Compras, Configuración. `SubmitButton`: con rol `admin` está habilitado; con `role: null`/`mode: "demo"` está deshabilitado y muestra "No disponible en la demo"; `pending` lo deshabilita. `UserMenu` en modo demo muestra "Salir de la demo" (llama a `exitDemo`) y no "Cerrar sesión"; en `member`, lo actual. `OrgSwitcher` en modo demo no abre desplegable (una sola fábrica).
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar.** `AppShell` envuelve el contenido en `AccessProvider` y muestra `DemoBanner` encima de `Topbar` cuando `session.mode === "demo"`; el grupo "Gestión" desaparece del menú por estar vacío. Borrar las cuatro páginas placeholder (`module-placeholder.tsx` se conserva: lo usan Compras y Producción hasta el 4B). Quitar de `command-menu.tsx` los destinos eliminados si los listara.
- [ ] **Step 4: Verde.** Revisar a mano en `http://localhost:3000/demo` (requiere Task 2 hecha en la nube): franja visible, menú correcto, "Salir de la demo" vuelve a `/`. Commit `feat: interfaz de solo lectura para la demo pública`.

---

### Task 5: Landing — "Probar la demo"

**Files:**
- Modify: `src/features/marketing/components/{hero,site-header,site-footer,demo-section}.tsx`, `src/features/marketing/content.ts`
- Test: `src/features/marketing/components/landing-cta.test.tsx` (nuevo)

**Interfaces:**
- Consumes: ruta `/demo` (Task 3).

- [ ] **Step 1: Test en rojo** (`landing-cta.test.tsx`): `Hero` y `SiteHeader` renderizan un enlace "Probar la demo" con `href="/demo"` y **no** contienen "Solicitar demostración" ni "videollamada"; `DemoSection` ofrece "Probar la demo" (`href="/demo"`) y no renderiza `DemoRequestForm`; `MODULES` ya no contiene los títulos "Compras y proveedores" ni "Costos y reportes" (pasan a "Compras" y "Costos") y ningún `points` menciona proveedores como pantalla ni reportes.
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar.** Reemplazar el CTA principal del encabezado, el hero (manteniendo "Ver cómo funciona") y el pie por "Probar la demo". `DemoSection` (id `demo`): título/texto invitando a recorrer la demo ("Sin registrarte, sin instalar nada. Es de solo lectura.") con el botón; el componente `demo-request-form.tsx` y `submitDemoRequest` quedan en el repo sin enlazar. Ajustar `content.ts` según la sección 5.13 del diseño; las capturas reales llegan al final del 4B (el marco vacío se mantiene).
- [ ] **Step 4: Verde** (`npm test`, `lint`, `typecheck`). Commit `feat(landing): "Probar la demo" reemplaza al formulario de solicitud`.

---

### Task 6: Dashboard — funciones SQL

**Files:**
- Create: `supabase/migrations/20261123000200_dashboard.sql`, `supabase/tests/dashboard.test.ts`

**Interfaces:**
- Produces:
  - `public.dashboard_data(p_org uuid) returns jsonb` (`stable`, **`security invoker`**: la visibilidad la dan las políticas RLS). Forma exacta:
    `{ "asOf": "YYYY-MM-DD", "kpis": { "products": int, "rawMaterials": int, "inventoryValue": num, "activeOrders": int, "unitsThisMonth": num, "unitsSamePeriodLastMonth": num }, "monthlyProduction": [{ "month": "YYYY-MM", "units": num }] (12 meses terminando en el mes de asOf, rellenando con 0), "inventoryFlow": [{ "month", "inValue": num, "outValue": num }] (idem), "alerts": [{ "kind": "low_stock"|"out_of_stock"|"delayed_order"|"late_purchase", "title": text, "detail": text, "entityType": "item"|"production_order"|"purchase_order", "entityId": uuid, "itemType": "finished_good"|"raw_material"|null }] (máx. 20, ordenadas: sin stock, bajo mínimo, órdenes demoradas, compras vencidas) }`.
  - `public.recent_activity(p_org uuid, p_limit int default 8) returns table (id uuid, summary text, actor_name text, occurred_at timestamptz, entity_type text, entity_id uuid)` (**`security definer`**; devuelve filas solo si `p_org in (select private.user_org_ids()) or p_org = private.public_demo_org_id()`; `actor_name` = primer nombre del perfil o `'Sistema'`).
  - Ambas: `revoke ... from public`, `grant execute ... to anon, authenticated`.
- Definiciones: `products`/`rawMaterials` = ítems `status='active'` y `archived_at is null` por tipo; `inventoryValue` = Σ `current_stock * avg_cost` de ítems no archivados con stock > 0; `activeOrders` = órdenes en `planned|in_progress|quality_check`; `unitsThisMonth` = Σ `quantity` de `stock_movements` con `movement_type='production_output'` del mes de `asOf` (en la zona horaria de la fábrica) hasta `asOf`; `unitsSamePeriodLastMonth` = lo mismo del mes anterior hasta el mismo día del mes (acotado al último día de ese mes); `inventoryFlow`: `inValue` = Σ `total_cost` con `quantity>0`, `outValue` = Σ `-total_cost` con `quantity<0`, por mes.
- **`asOf`**: para fábricas normales, la fecha de hoy en su zona horaria (`private.org_today`); para fábricas `is_demo`, `least(hoy, fecha del último movimiento)`, de modo que una demo envejecida no muestre el mes actual vacío.

- [ ] **Step 1: Tests en rojo** (`dashboard.test.ts`), con una fábrica armada por SQL/RPC con fechas explícitas: ítems activos/archivados, una entrada de compra y una salida con costo conocido, dos órdenes completadas en meses distintos con `good_qty` y `production_output`, una planificada con `planned_end_date` vencida, un ítem sin stock y uno bajo mínimo. Afirmar números exactos para cada campo de `kpis`, la longitud 12 y el orden de `monthlyProduction`, los `kind` de `alerts`, y que `asOf` de una fábrica demo envejecida es la fecha del último movimiento. Además: `recent_activity` devuelve 8 filas máximo, ordenadas por `occurred_at desc`, con `actor_name` de primer nombre; **con `p_org` de otra fábrica**, `dashboard_data` devuelve `kpis` en cero/arrays vacíos para un usuario ajeno y `recent_activity` devuelve 0 filas; `anon` obtiene datos solo de la demo pública. Fábrica vacía: `kpis` en 0, sin `null`.
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar** la migración (SQL puro/`plpgsql`, sin `UPDATE`/`DELETE`; repetir el bloque de `revoke`/`grant` del patrón).
- [ ] **Step 4: Verde** (`npm run test:db`). Commit `feat(db): dashboard_data y recent_activity`.

---

### Task 7: Dashboard real en `/app`

**Files:**
- Create: `src/features/dashboard/queries.ts`, `src/features/dashboard/queries.test.ts`
- Modify: `src/features/dashboard/types.ts`, `src/app/app/page.tsx`, componentes de `src/features/dashboard/components/*` solo si hace falta, `src/components/data/sample-data-badge.tsx` (se deja de usar en el dashboard)

**Interfaces:**
- Consumes: `dashboard_data`, `recent_activity` (Task 6); `requireSession()` (`session.activeOrganizationId`).
- Produces: `getDashboard(orgId: string): Promise<{ asOf: string; kpis: DashboardKpis; monthlyProduction: MonthlyProduction; inventoryFlow: InventoryFlow; alerts: DashboardAlert[]; activity: ActivityEntry[] }>` (server-only; valida la respuesta con Zod y lanza si no coincide). `alertHref(a: { kind; entityType; entityId; itemType }): string`: ítems → `/app/productos/<id>` o `/app/materias-primas/<id>`; órdenes de producción → `/app/produccion`; compras → `/app/compras` (en el 4B pasan a las fichas).

- [ ] **Step 1: Tests en rojo** (`queries.test.ts`): el parser Zod acepta el JSON del contrato y rechaza forma inválida; `alertHref` devuelve las rutas indicadas para cada combinación; una respuesta vacía produce un dashboard válido (arrays vacíos, KPIs en 0).
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar** `getDashboard` (dos RPC en paralelo con `createClient()`), y rehacer `page.tsx`: componente async dentro de `<Suspense>` con esqueleto, `PageHeader` con "Estado de la planta al {asOf}", sin `SampleDataBadge`; `FIXTURE_*` ya no se importan acá. La variación de unidades del mes se calcula con protección: si `unitsSamePeriodLastMonth === 0`, no se muestra porcentaje (en `kpi-row.tsx`, si lo calcula; cubrir con test del componente). Los accesos rápidos de escritura ("Nueva orden", "Nueva compra", "Nuevo producto") siguen visibles; en modo demo se ven y llevan a pantallas de solo lectura.
- [ ] **Step 4: Verde** y verificación manual con `npm run dev`: `/demo` muestra números reales de la demo; con la cuenta del dueño en `/app` también. Commit `feat: dashboard con datos reales`.

---

### Task 8: Reglas de catálogo en la base — guardas, receta y costo estándar

**Files:**
- Create: `supabase/migrations/20261123000300_catalog_rules.sql`, `supabase/tests/catalog-rules.test.ts`

**Interfaces:**
- Produces:
  - Trigger `private`: `items.unit_id` no se puede cambiar si el ítem tiene movimientos (`P0001`: "No se puede cambiar la unidad de un ítem con movimientos").
  - Trigger sobre `organizations`: `timezone` debe existir en `pg_timezone_names` (`P0001`: "Zona horaria inválida").
  - `public.save_bom(p_item uuid, p_output_qty numeric, p_default_waste_pct numeric, p_notes text, p_lines jsonb) returns uuid` — `security definer`, `require_role(org del ítem, '{admin}')`; solo para `finished_good`; `p_lines` = `[{ "componentItemId": uuid, "quantity": num, "wastePct": num|null }]`; crea o actualiza la receta y **reemplaza** todas sus líneas atómicamente (posición = orden del arreglo); exige al menos una línea; devuelve el `bom.id`. Registra actividad (`log_activity`) "Actualizó la receta de {nombre}".
  - Vista `public.item_costing` (`security_invoker = true`): `item_id`, `organization_id`, `materials_cost`, `labor_cost`, `overhead_cost`, `standard_cost` por **1 unidad** de producto, con **la misma fórmula** que `private.create_production_order_core`: materiales = Σ `round(round(l.quantity / b.output_qty * (1 + coalesce(l.waste_pct, b.default_waste_pct, org.default_waste_pct)/100), 3) * comp.avg_cost, 2)`; mano de obra = `round(i.standard_labor_minutes / 60 * org.default_labor_rate, 2)`; indirectos = `round(i.overhead_per_unit, 2)`. Solo ítems `finished_good`. `grant select ... to authenticated, anon`. **No inlinear funciones `private`** (el invocador no puede ejecutarlas).
- Verificar en el test (y agregar a la migración si falta) que `archived_at` esté en el `grant update` de `items` para `authenticated`.

- [ ] **Step 1: Tests en rojo.** Unidad: cambiar `unit_id` de un ítem sin movimientos funciona; con un movimiento → error con el mensaje exacto. Zona horaria: `'America/Argentina/Buenos_Aires'` pasa, `'Marte/Olimpo'` falla con "Zona horaria inválida" (si PGlite no trae `pg_timezone_names`, validar con `exists (select 1 from pg_timezone_names ...)` igualmente y, de no existir la vista en PGlite, crear el equivalente en `shim.sql`). `save_bom`: crea; reemplaza líneas (queda solo el nuevo conjunto); rechaza lista vacía, componente que no sea `raw_material`, ítem de otra fábrica y usuario no admin/`anon`; es idempotente en `output_qty`. `item_costing`: para un producto con receta y `avg_cost` conocidos, `materials_cost + labor_cost + overhead_cost = standard_cost` y **coincide exactamente con `planned_material_cost`, `planned_labor_cost`, `planned_overhead_cost`** de una orden creada con `create_production_order` de cantidad 1 para ese producto.
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar** la migración (sin `UPDATE`/`DELETE` sin `WHERE`; patrón final de `revoke`/`grant`; `grant execute on function public.save_bom to authenticated`, `revoke ... from public, anon`).
- [ ] **Step 4: Verde.** Aplicar a la nube (`npm run db:push`), regenerar tipos (`npm run db:types` + prettier), `npm run typecheck`. Commit `feat(db): guardas de unidad y zona horaria, save_bom e item_costing`.

---

### Task 9: Listas de Productos y Materias primas con datos reales

**Files:**
- Create: `src/features/items/{queries.ts,queries.test.ts,search.ts,search.test.ts}`
- Modify: `src/app/app/productos/page.tsx`, `src/app/app/materias-primas/page.tsx`, `src/features/products/components/{products-table,stock-cell}.tsx` (se generalizan con la prop `kind`), `src/fixtures/products.ts` (deja de usarse)

**Interfaces:**
- Produces:
  - `ItemKind = "finished_good" | "raw_material"`; `ItemRow` = `{ id, sku, name, description, category: {id,name}|null, unitCode, currentStock, minStock, avgCost, standardCost: number|null, salePrice: number|null, status: "active"|"inactive", archived: boolean, level: StockLevel }`.
  - `ITEM_TABLE_OPTIONS = { sortable: ["sku","name","currentStock","cost","salePrice"], filterable: ["category","level","status"], defaultSort: { id: "name", desc: false } }`.
  - `listItems(kind: ItemKind, params: TableParams): Promise<{ rows: ItemRow[]; total: number }>` (server-only; filtros, búsqueda, orden y paginación **en la consulta**, `count: "exact"`); `listCategories(kind: ItemKind): Promise<{ id: string; name: string }[]>`.
  - `sanitizeSearch(q: string): string` en `search.ts`: quita `,` `(` `)` `*` `%` `\` y comillas, recorta a 100 caracteres y colapsa espacios; devuelve `""` si no queda nada.

- [ ] **Step 1: Tests en rojo.** `sanitizeSearch`: `"a,b(c)*%\\"` → `"a b c"` (espacios colapsados), solo símbolos → `""`, 150 caracteres → 100. `listItems` con `@/lib/supabase/server` mockeado vía `vi.mock` (un doble encadenable que registra los filtros aplicados): aplica `kind` como filtro `type`, traduce `filters.level` a `item_stock_status.level`, orden por `cost` mapea a `avg_cost` (MP) o `standard_cost` (producto), la búsqueda usa `or(sku.ilike…,name.ilike…)` solo con el texto sanitizado, `pageSize`/`page` hostiles ya vienen acotados por `parseTableParams`, y `standardCost` es `null` para materias primas.
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar.** `listItems` une `items`, `units`, `categories`, `item_stock_status` y `item_costing` (productos) con relaciones de PostgREST. Las páginas llaman `requireSession()` solo para obtener el modo (no hace falta `orgId`: RLS filtra) dentro de `<Suspense>`; encabezados "Productos"/"Materias primas" sin `SampleDataBadge`. `ProductsTable` pasa a recibir `kind` y `ItemRow`; la columna de costo muestra `standardCost` (producto) o `avgCost` (MP); la columna de precio solo para productos; cada fila enlaza a `/app/productos/<id>` o `/app/materias-primas/<id>`. El botón "Nuevo" y la edición se conectan en la Task 10 (por ahora quedan visibles y abren el diálogo existente).
- [ ] **Step 4: Verde** + verificación manual (`/demo/productos` equivale a `/app/productos`): búsqueda, filtro por categoría y nivel, orden y paginación por URL con datos de la demo. Commit `feat: listas de productos y materias primas con datos reales`.

---

### Task 10: Alta, edición y archivo de ítems + ficha

**Files:**
- Create: `src/features/items/{schemas.ts,schemas.test.ts,actions.ts,actions.test.ts}`, `src/features/items/components/{item-summary.tsx,item-movements.tsx,item-used-in.tsx,archive-button.tsx}`, `src/app/app/productos/[id]/page.tsx`, `src/app/app/materias-primas/[id]/page.tsx`
- Modify: `src/features/products/components/product-form-dialog.tsx`, `src/features/products/schemas.ts` (se amplía), `src/features/items/queries.ts`

**Interfaces:**
- Consumes: `SubmitButton`, `useAccess` (Task 4); `ItemRow`, `listCategories` (Task 9); `item_costing` y el trigger de unidad (Task 8).
- Produces:
  - `itemSchema` (Zod): `kind`, `name`, `sku`, `description`, `categoryId|null`, `unitCode`, `minStock`, `salePrice|null` (solo producto), `standardLaborMinutes` (≥0, solo producto), `overheadPerUnit` (≥0, solo producto), `preferredSupplierId|null` (solo MP). **No incluye `manualCost`.**
  - Server Actions (`createAction`, `permission: "manageCatalog"`): `saveItem({ id?: string, ...itemSchema })` → `{ id: string }` (insert o update bajo RLS; `unitCode` → `unit_id`; en update no envía `unit_id` si el ítem tiene movimientos y el formulario deshabilita el campo); `setItemArchived({ id: string, archived: boolean })` → `null` (usa `archived_at`).
  - `getItem(id: string)` → `{ item, category, unitCode, costing: { materials, labor, overhead, standard }|null, stock: { physical, committed, available, level } , marginPct: number|null }` o `null`; `listItemMovements(itemId, limit = 50)` → filas con `occurredAt`, `type`, `quantity`, `unitCost`, `balanceAfter`, `reason`, `reference: string|null` (código de orden/compra si lo hay, **sin enlace** hasta el 4B); `listUsedIn(itemId)` → productos cuyas recetas usan la MP; `listRecentPurchases(itemId, limit = 5)`.

- [ ] **Step 1: Tests en rojo.** `itemSchema`: nombre <2 caracteres, SKU con caracteres inválidos, números negativos, `salePrice` presente en una MP (se rechaza o se ignora; definir: se ignora y se descarta) y la ausencia de `manualCost` en el tipo. `saveItem`/`setItemArchived` (con `vi.mock` de `@/lib/auth/session` y `@/lib/supabase/server`): rechazan sesión demo (`"No disponible en la demo"`), rechazan sin permiso, traducen `23505` a "Ya existe un registro con ese dato (por ejemplo, el mismo SKU)", y `saveItem` no manda `unit_id` en update cuando `unitLocked` es verdadero. Margen: `marginPct = (salePrice - standard)/salePrice*100` y `null` si falta el precio o es 0.
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar.** El diálogo usa `SubmitButton permission="manageCatalog"` (en demo se abre, se completa y el botón dice "No disponible en la demo"); quitar el campo "costo estimado"; agregar minutos estándar e indirectos (producto) y proveedor preferido (MP, desplegable de proveedores existentes); deshabilitar la unidad con un texto de ayuda cuando el ítem ya tiene movimientos. Archivar/reactivar con `ConfirmDialog` existente. Fichas: encabezado con SKU, estado y acciones; resumen (stock, disponible, costo promedio / último costo, mínimo, precio, margen); producto: **costo estándar desglosado** y (placeholder de la pestaña Receta, Task 11) y "Órdenes" como lista simple de las últimas 10 sin enlace; MP: "Usado en" y "Compras recientes"; ambas: "Movimientos". `notFound()` si `getItem` devuelve `null`. Ítems de otra fábrica no existen para el usuario (RLS) → 404.
- [ ] **Step 4: Verde** y verificación manual con la cuenta del dueño (crear, editar, archivar un producto y una MP; ver que el stock/costo de la ficha coincide con el Dashboard) y en `/demo` (todo se ve y nada se guarda). Commit `feat: alta, edición, archivo y fichas de productos y materias primas`.

---

### Task 11: Receta en la ficha del producto (ver, editar y calcular)

**Files:**
- Create: `src/features/items/bom-schemas.ts` (+ test), `src/features/items/components/{bom-panel.tsx,bom-editor-dialog.tsx,bom-calculator-panel.tsx}` (+ tests de los componentes), acción `saveBom` en `src/features/items/actions.ts`
- Modify: `src/features/items/queries.ts`, `src/app/app/productos/[id]/page.tsx`

**Interfaces:**
- Consumes: `save_bom` (Task 8); `calculateMaterialRequirements`, `BomLineInput`, `MaterialRequirement` de `src/features/production/logic.ts`.
- Produces: `bomSchema` (`outputQty > 0`, `defaultWastePct` 0–100|null, `notes`, `lines` ≥1 con `componentItemId`, `quantity > 0`, `wastePct` 0–100|null, sin componentes repetidos); `saveBom({ itemId: string, ...bomSchema })` (`createAction`, `permission: "manageCatalog"`, llama `save_bom`); `getBom(itemId: string)` → `{ outputQty, defaultWastePct, notes, lines: (BomLineInput & { avgCost: number; stock: number })[] } | null`; `listRawMaterialOptions(): Promise<{ id: string; name: string; unitCode: string }[]>`.

- [ ] **Step 1: Tests en rojo.** `bomSchema`: lista vacía, componente repetido, cantidad 0, porcentaje 101 → mensajes en español. `BomCalculatorPanel` (Testing Library): con receta de rendimiento 10 y línea 5 kg al 3% de desperdicio, ingresar 100 muestra requerido `51,5` kg y marca faltante cuando `stock` es menor (valores con formato argentino); con `plannedQty` vacío o ≤0 no muestra filas ni `NaN`. `BomEditorDialog`: no permite agregar el mismo componente dos veces; en modo demo el botón de guardar dice "No disponible en la demo" y no llama a la acción.
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar.** Pestaña "Receta" en la ficha: tabla de líneas (materia prima, cantidad por rendimiento, % desperdicio, costo de línea con `avgCost`), botón "Editar receta" (diálogo con filas dinámicas, RHF `useFieldArray`) y debajo la calculadora "Para fabricar N" reutilizando `calculateMaterialRequirements`. Estado vacío: "Este producto todavía no tiene receta".
- [ ] **Step 4: Verde** y verificación manual (editar la receta de un producto como dueño y comprobar que el costo estándar de la ficha cambia en consecuencia). Commit `feat: receta editable y calculadora de materiales en la ficha`.

---

### Task 12: Inventario — existencias y movimientos manuales

**Files:**
- Create: `src/features/inventory/{queries.ts,queries.test.ts,schemas.ts,schemas.test.ts,actions.ts,actions.test.ts}`, `src/features/inventory/components/{stock-table.tsx,movement-dialog.tsx,adjustment-dialog.tsx}`
- Modify: `src/app/app/inventario/page.tsx`

**Interfaces:**
- Consumes: `create_manual_movement(p_item, p_type, p_quantity, p_reason, p_unit_cost)`, `create_stock_adjustment(p_item, p_counted_qty, p_reason)`; `SubmitButton`; `parseTableParams`/`DataTable`.
- Produces:
  - `STOCK_TABLE_OPTIONS = { sortable: ["sku","name","physical","available","value"], filterable: ["type","category","level"], defaultSort: { id: "name", desc: false } }`.
  - `StockRow` = `{ itemId, sku, name, type: ItemKind, categoryName: string|null, unitCode, physical, committed, available, avgCost, value: number, level: StockLevel, minStock }`; `listStock(params: TableParams): Promise<{ rows: StockRow[]; total: number; totals: { value: number; out: number; low: number } }>` (totales sobre el conjunto filtrado completo, no solo la página).
  - `movementSchema` (`itemId`, `type: "manual_in"|"manual_out"`, `quantity > 0`, `unitCost ≥ 0 | null` (solo entrada), `reason` obligatorio 3–200); `adjustmentSchema` (`itemId`, `countedQty ≥ 0`, `reason` obligatorio).
  - `registerMovement(input)` y `registerAdjustment(input)` (`createAction`, `permission: "manageInventory"`, llaman a las RPC; `ActionError` en español para `P0001`).

- [ ] **Step 1: Tests en rojo.** Esquemas: motivo vacío o solo espacios, cantidad 0/negativa, `unitCost` en una salida, `countedQty` negativo. Acciones: sesión demo → "No disponible en la demo"; sin permiso; se llama a la RPC con los parámetros exactos (`p_unit_cost: null` en salidas); un error `P0001` con mensaje de stock insuficiente llega tal cual al usuario. Consultas: el filtro `level` se traduce a `item_stock_status.level`; `value = physical * avgCost` redondeado a 2 decimales; con cero ítems devuelve `totals` en 0. Componente: la tabla marca con indicador los niveles `out`/`low`; los diálogos abren en demo y el botón queda bloqueado.
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar.** Página con tarjetas de totales (valor, sin stock, bajo mínimo), tabla (`DataTable`) con filtros por tipo, categoría y nivel, y por fila un menú "Entrada / Salida / Ajuste por conteo" que abre el diálogo correspondiente; cada acción refresca con `revalidatePath("/app/inventario")` y `/app` (el dashboard cambia). En la demo, los diálogos muestran lo mismo y el botón de confirmar dice "No disponible en la demo".
- [ ] **Step 4: Verde** y verificación manual con la cuenta del dueño: registrar una entrada manual con costo y comprobar que sube el stock, el costo promedio y el valor del inventario del Dashboard; intentar una salida mayor al stock y leer el error. Commit `feat: inventario con existencias y movimientos manuales`.

---

### Task 13: Inventario — historial de movimientos y reversión

**Files:**
- Create: `src/app/app/inventario/movimientos/page.tsx`, `src/features/inventory/components/{movements-table.tsx,reverse-dialog.tsx}`
- Modify: `src/features/inventory/{queries.ts,schemas.ts,actions.ts}` (+ tests), `src/app/app/inventario/page.tsx` (enlace "Ver movimientos")

**Interfaces:**
- Consumes: `reverse_stock_movement(p_movement, p_reason)`.
- Produces: `MOVEMENT_TABLE_OPTIONS = { sortable: ["occurredAt","quantity"], filterable: ["type","item"], defaultSort: { id: "occurredAt", desc: true } }` (+ `from`/`to` como parámetros de fecha validados); `MovementRow` = `{ id, occurredAt: string, itemId, itemName, sku, unitCode, type, quantity, unitCost: number|null, totalCost: number|null, balanceAfter: number|null, reason: string|null, reference: string|null, reversible: boolean, reversed: boolean }`; `listMovements(params): Promise<{ rows: MovementRow[]; total: number }>`; `reverseSchema` (`movementId: uuid`, `reason` obligatorio); `reverseMovement(input)` (`createAction`, `permission: "manageInventory"`).
- `reversible` = tipo `manual_in | manual_out | adjustment`, no es una reversión y no fue revertido; `reference` = código de la orden de producción o de la compra asociada, **solo texto** (los enlaces a las fichas se agregan en el 4B).

- [ ] **Step 1: Tests en rojo.** Fechas inválidas (`from > to`, texto) se ignoran; `reversible` falso para `purchase_receipt`, `production_*` y `reversal`; `reverseSchema` sin motivo; `reverseMovement` en demo; `listMovements` ordena por defecto del más nuevo al más viejo y filtra por tipo/ítem; el parámetro de ítem solo acepta UUID (cualquier otra cosa se descarta).
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar** la página (filtros por fecha, tipo e ítem; tabla con saldo; acción "Revertir" solo en filas reversibles, con diálogo de motivo) y el enlace desde Existencias.
- [ ] **Step 4: Verde** y verificación manual: revertir una entrada manual como dueño; en la demo el botón existe pero no guarda. Commit `feat: historial de movimientos de inventario con reversión`.

---

### Task 14: Configuración — datos de la fábrica y restablecer demo

**Files:**
- Create: `src/features/settings/{schemas.ts,schemas.test.ts,actions.ts,actions.test.ts}`, `src/features/settings/components/{general-form.tsx,demo-reset.tsx}`
- Modify: `src/app/app/configuracion/page.tsx`

**Interfaces:**
- Consumes: `update` sobre `organizations` (columnas con grant), `reset_demo_organization(p_org)`; `requireSession()` (en modo demo la página hace `redirect("/app")`).
- Produces: `generalSettingsSchema` (`name` 2–120, `legalName`, `cuit` (formato `NN-NNNNNNNN-N` o vacío), `address`, `city`, `province`, `phone`, `email` (válido o vacío), `timezone` (string no vacío), `defaultWastePct` 0–100, `defaultLaborRate ≥ 0`, `allowNegativeStock: boolean`); `saveGeneralSettings(input)` (`createAction`, `permission: "manageSettings"`); `resetDemoData()` (`createAction`, `permission: "manageSettings"`; solo si la fábrica activa es demo; llama a la RPC; **nunca** disponible para la demo pública en modo visitante).
- `getOrganizationSettings(orgId)` → los mismos campos + `isDemo`.

- [ ] **Step 1: Tests en rojo.** Esquema: CUIT mal formado, email inválido, porcentajes fuera de rango, nombre corto; `saveGeneralSettings` mapea "Zona horaria inválida" (`P0001`) al campo/mensaje; `resetDemoData` rechaza fábricas no demo con "Sólo las organizaciones demo se pueden restablecer" y rechaza el modo demo con "No disponible en la demo".
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar.** Página con pestañas "General" · "Usuarios" (lo existente) y, solo en fábricas demo, bloque "Datos de demostración" con "Restablecer datos demo" y `ConfirmDialog` (aclarando que regenera los datos de ejemplo). En modo demo la ruta redirige a `/app` (el menú ya no la muestra). Quitar el texto "se suman en la Etapa 4" del encabezado.
- [ ] **Step 4: Verde** y verificación manual con la cuenta del dueño (editar un dato, probar una zona horaria inválida, restablecer la demo y comprobar que `/app` recupera los datos). Commit `feat: configuración general y restablecimiento de la demo`.

---

### Task 15: Cierre del bloque 4A

**Files:**
- Delete (si ya nadie los importa): `src/fixtures/dashboard.ts`, `src/fixtures/products.ts` y sus tests; `src/components/data/sample-data-badge.tsx` solo si queda sin usos.
- Modify: `README.md` (nuevo flujo de demo pública y scripts), `docs/superpowers/specs/2026-11-22-etapa-4-design.md` (solo si una decisión cambió durante la implementación)

- [ ] **Step 1:** `grep` de imports a `@/fixtures/*` y de `SampleDataBadge`; borrar lo que quedó sin usos (Compras y Producción siguen con `ModulePlaceholder`, no tocarlos).
- [ ] **Step 2:** Verificación completa: `npm test`, `npm run test:db`, `npm run typecheck`, `npm run lint`, `npm run build`. Contra la nube: `npm run db:verify` en verde.
- [ ] **Step 3:** Recorrido manual en el navegador, en modo claro y oscuro y en ancho móvil: (a) `/demo` → franja, Dashboard con números, Productos (búsqueda/filtros), ficha con receta y calculadora, Materias primas, Inventario y movimientos, diálogos que abren y no guardan; (b) sesión del dueño → mismas pantallas con escritura; (c) caso de revisión 3: sin demo pública cargada, `/demo` lleva a `/ingresar` con el mensaje.
- [ ] **Step 4:** Commit `chore: cierre del bloque 4A` y **detenerse para la revisión con el autor** (aprobar antes de empezar el 4B).
