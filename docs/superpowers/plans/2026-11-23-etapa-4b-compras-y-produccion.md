# Etapa 4 · Bloque 4B (versión simple) — Compras, Producción, alertas y capturas · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el ciclo se vea funcionando sobre la base real —comprar, recibir, planificar con faltantes en vivo, producir y comparar costo planificado contra real— con la campana de alertas en vivo y capturas reales en la landing. Es un proyecto de portfolio: lo mínimo que se ve bien y demuestra el valor.

**Architecture:** Igual que el 4A: lecturas por vistas `security_invoker` (la demo pública las lee como `anon`), escrituras por las RPC transaccionales de la Etapa 3 detrás de `createAction` (rechaza el modo demo), formularios que en la demo se abren y calculan pero no guardan (`SubmitButton`). Toda consulta de servidor filtra por la fábrica activa.

**Tech Stack:** Next.js 16.4.5 (Cache Components, `proxy.ts`), TypeScript, Supabase (PostgREST, RLS, RPC), PGlite, Vitest + Testing Library, Zod 4, React Hook Form, Playwright (capturas), shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-11-22-etapa-4-design.md` (5.9, 5.10, 5.11 alertas, 5.13). Continúa el bloque 4A (`docs/superpowers/plans/2026-11-23-etapa-4a-demo-publica-y-catalogo.md`, en `main`).

## Recortes acordados con el autor (22–23/11/2026)

Quedan **fuera** del 4B (posibles retoques después): editor de órdenes de compra a mano (nueva/editar borrador) y `save_purchase_draft`; revertir recepciones; enviar a calidad / volver a producción como botones; devoluciones al cancelar y edición de horas al completar; búsqueda de productos/órdenes/compras en `Ctrl+K` (el buscador de módulos que ya existe queda como está). Una compra nace de **"Crear compra con faltantes"** desde una orden de producción.

## Global Constraints

- Leer la guía correspondiente en `node_modules/next/dist/docs/` antes de escribir código de Next (AGENTS.md). Cache Components: `cookies()`/`headers()`/`params`/`searchParams` dentro de `<Suspense>`; verificar cada tarea con `npm run build`.
- UI en español rioplatense, formato argentino (`src/lib/format.ts`). Sin claves privadas en el frontend; la clave secreta nunca en la demo. Lógica crítica en la base (RPC/RLS); control de acceso en interfaz **y** backend.
- No modificar migraciones aplicadas: todo cambio de esquema va en migraciones nuevas (siguen `20261123000800`), que repiten al final el patrón `revoke execute on all functions in schema private from public, anon, authenticated; grant execute on function private.user_org_ids(), private.user_admin_org_ids(), private.colleague_ids(), private.is_draft_purchase(uuid), private.is_active_production(uuid), private.uuid_or_null(text) to authenticated; grant execute on function private.public_demo_org_id() to anon, authenticated;`.
- Supabase en la nube rechaza `UPDATE`/`DELETE` sin `WHERE` (`safeupdate.test.ts` lo vigila). Aplicar cada migración a la nube (`npm run db:push`), regenerar tipos (`npm run db:types` + `npx prettier --write src/types/database.ts`) y correr `npm run db:verify`.
- **Lecciones del 4A que valen acá:** toda consulta de servidor recibe `orgId` y filtra por `organization_id` (RLS deja ver todas las fábricas del usuario más la demo pública); las listas con `count: "exact"` manejan `PGRST103` con `isOutOfRange` (`@/lib/db-errors`) y terminan en la última página (patrón de `src/features/items/queries.ts`); una acción verifica que el registro sea de la fábrica activa antes de llamar a la RPC (patrón de `src/features/inventory/actions.ts`); filtros de texto con `sanitizeSearch` (`src/features/items/search.ts`); cada formulario usa `SubmitButton`, muestra el error del servidor en `FormAlert` y hace `router.refresh()`; los tests mockean `@/lib/supabase/server` con `vi.mock` (ver `src/features/inventory/*.test.ts`), los de jsdom necesitan el polyfill de `ResizeObserver`, y los ids de prueba tienen que ser UUID válidos.
- Cada tarea termina con `npm test`, `npm run typecheck`, `npm run lint` y `npm run build` en verde, y un commit en español con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Las claves/tokens no se piden por el chat.

## Review Focus

1. **Recepción de compras**: recibir más de lo pendiente, 0, decimales en una unidad entera o una línea ajena → mensaje legible del servidor, sin dejar estado inconsistente.
2. **Doble envío** en acciones (Confirmar, Recibir, Iniciar, Completar, Cancelar): el botón se deshabilita mientras corre y, si llega una segunda, la base responde "ya no está…" y la interfaz lo muestra.
3. **Nueva orden con producto sin receta o con materiales faltantes**: se explica antes de enviar, no sólo con el error de la base.
4. **Completar desde "en producción"**: la acción pasa por control de calidad y completa; si el segundo paso falla, la orden queda en "control de calidad" y la ficha ofrece completar de nuevo (sin estados huérfanos ni botones que no corresponden).
5. **Demo y enlaces**: toda escritura deshabilitada pero los formularios abren y la vista previa calcula; ningún enlace nuevo (alertas, movimientos, fichas) lleva a un 404.

---

## Estructura de archivos

**Base de datos**: `supabase/migrations/20261123000900_purchasing_production_views.sql`, `…001000_anon_no_authors.sql`; tests `supabase/tests/{purchasing-production-views,anon-no-authors}.test.ts`.

**Compras** (`src/features/purchasing/`): `types.ts`, `queries.ts`, `schemas.ts`, `actions.ts`, `components/{purchases-table,purchase-detail,purchase-actions,receive-dialog}.tsx`; páginas `src/app/app/compras/{page,[id]/page}.tsx`.

**Producción** (`src/features/production/`, además de `logic.ts`): `types.ts`, `queries.ts`, `schemas.ts`, `actions.ts`, `components/{orders-table,order-detail,order-form,materials-preview,order-actions,progress-dialog,complete-dialog,cancel-dialog,shortage-dialog}.tsx`; páginas `src/app/app/produccion/{page,nueva/page,[id]/page}.tsx`.

**Shell y landing**: `src/components/layout/{notifications-menu,topbar,app-shell}.tsx`, `src/features/dashboard/{data.ts,components/quick-actions.tsx}`, `scripts/capturas.mts`, `public/capturas/*.png`, `src/features/marketing/components/{screenshot-frame,modules-showcase,hero}.tsx`, `content.ts`.

---

### Task 1: Base de datos — vistas de compras y producción, referencias de movimientos y demo sin autores

**Files:** Create las 2 migraciones y los 2 tests de "Estructura de archivos"; modify `src/types/database.ts` (regenerado).

**Interfaces (todo `security_invoker`, `grant select … to anon, authenticated`, sin `created_by`/`actor_id`):**
- `public.purchase_overview`: `id, organization_id, code, status, order_date, expected_date, notes, subtotal, tax_total, total, cancel_reason, supplier_id, supplier_name, line_count int, received_pct int (0–100: Σ received_qty / Σ quantity), is_late boolean` (`status in ('pending','partially_received')` y `expected_date` anterior al hoy de la fábrica, `(now() at time zone o.timezone)::date`).
- `public.purchase_line_details`: `id, organization_id, purchase_order_id, item_id, item_name, item_sku, unit_code, quantity, unit_price, tax_rate, received_qty, pending_qty (≥ 0), line_total (quantity × unit_price, 2 decimales, sin IVA)`.
- `public.production_material_details`: `id, organization_id, production_order_id, item_id, item_name, item_sku, unit_code, planned_qty, consumed_qty, returned_qty, scrap_qty, waste_pct, cost_consumed, available` (de `item_stock_status`).
- `public.production_team`: `id, organization_id, production_order_id, employee_id, first_name, last_name, position, role_in_order, hours_worked`.
- `public.production_report_details`: `id, organization_id, production_order_id, report_date, good_qty, defective_qty, notes, created_at, employee_name`.
- `public.production_event_details`: `id, organization_id, production_order_id, from_status, to_status, note, occurred_at`.
- `public.movement_feed` se **recrea** con `create or replace` agregando al final `reference_type text` (`'purchase_order'|'production_order'|null`) y `reference_id uuid`.
- Cierre de autores: para cada tabla con `grant select … to anon` de la migración `…000100` (y las columnas de `…000800`) que tenga `created_by` o `actor_id`, reemplazar el `grant select` de tabla por `grant select (todas menos esas) … to anon`.

- [ ] **Step 1: Tests en rojo** (estilo `item-views.test.ts`; armar la fábrica con las RPC reales: compra de 2 líneas recibida a la mitad y otra pendiente, orden de producción creada e iniciada con un parte de avance). Casos con valores exactos: `received_pct` 50; `is_late` verdadero sólo en `pending/partially_received` vencidas (falso en `received`/`cancelled`); `pending_qty`, `line_total`; materiales con `available`; equipo con nombres; partes con `employee_name`; eventos en orden; `reference_type/reference_id` correctos para compra y producción y nulos en manuales; otra fábrica no ve nada; `anon` sólo ve la demo pública; `anon-no-authors`: ninguna columna `created_by`/`actor_id` legible por `anon` en `public` (recorrer `information_schema.column_privileges`) y las demás columnas de `items`, `activity_log` y `production_orders` siguen legibles.
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar** las migraciones (patrón final de `revoke`/`grant`; sin `UPDATE`/`DELETE` sin `WHERE`). Ajustar tests existentes que lean columnas de autor como `anon`.
- [ ] **Step 4: Verde:** `npm run test:db`; aplicar a la nube, regenerar tipos, `npm run db:verify` sin `✗`. Commit `feat(db): vistas de compras y producción y demo sin autores`.

---

### Task 2: Compras — lista, ficha y acciones (confirmar, recibir, cancelar)

**Files:**
- Create: `src/features/purchasing/{types.ts,queries.ts,queries.test.ts,schemas.ts,schemas.test.ts,actions.ts,actions.test.ts}`, `components/{purchases-table,purchase-detail,purchase-actions,receive-dialog}.tsx` (+ tests), `src/app/app/compras/[id]/page.tsx`
- Modify: `src/app/app/compras/page.tsx` (deja `ModulePlaceholder`), `src/features/dashboard/data.ts` (`alertHref`) y su test, `src/features/inventory/{types.ts,movement-row.ts}` (`referenceType`, `referenceId`), `src/features/inventory/components/movements-table.tsx` y `src/features/items/components/item-movements.tsx` (la referencia pasa a enlace), `src/features/items/components/item-related.tsx` (`PurchaseHistory` enlaza a la ficha), `src/features/dashboard/components/quick-actions.tsx` ("Registrar compra" → `/app/compras`).

**Interfaces:**
- Produces: `PURCHASE_TABLE_OPTIONS = { sortable: ["code","orderDate","expectedDate","total"], filterable: ["estado"], defaultSort: { id: "orderDate", desc: true } }`; `PurchaseRow` (campos de `purchase_overview` en camelCase); `listPurchases(orgId, params): Promise<{ rows; total }>` (estados válidos únicamente, búsqueda por código o proveedor con `sanitizeSearch`, `isOutOfRange`); `getPurchase(orgId, id): Promise<{ purchase: PurchaseRow; lines: PurchaseLineDetail[] } | null>` (UUID inválido → `null` sin consultar).
- Acciones (`createAction`, `permission: "managePurchasing"`, verifican que la orden sea de la fábrica activa; los mensajes de la base pasan tal cual): `confirmPurchase({ id })` → `confirm_purchase_order`; `receivePurchase({ id, deliveryNote (≤ 40, opcional), receivedAt: YYYY-MM-DD no futura, lines: [{ lineId: uuid, quantity > 0 }] })` → `receive_purchase_order(p_id, p_delivery_note, p_received_at, p_lines = [{ line_id, quantity }])`; `cancelPurchase({ id, reason (3–200) })` → `cancel_purchase_order`. `PurchaseActions({ purchase, lines })` muestra por estado: borrador → Confirmar, Cancelar; pendiente/parcial → Recibir, Cancelar; resto → nada. `ReceiveDialog` precarga lo pendiente por línea, no deja pasar más que lo pendiente ni 0 en todas, y no admite decimales en una unidad entera (`allowsDecimals`). En la demo todo visible; los diálogos abren y el botón final dice "No disponible en la demo".
- `alertHref`: `late_purchase` → `/app/compras/<entityId>`, `delayed_order` → `/app/produccion/<entityId>`. La referencia de un movimiento enlaza a `/app/compras/<id>` o `/app/produccion/<id>` según `referenceType`.

- [ ] **Step 1: Tests en rojo.** `listPurchases`/`getPurchase` (mocks: fábrica, estado válido, orden, búsqueda sanitizada, `PGRST103` → última página, `null`); esquemas (cantidad 0/negativa, motivo vacío, fecha futura, línea que no es UUID); acciones (demo y sin permiso rechazan, orden ajena, parámetros exactos de cada RPC, error de base legible, "ya no está…" llega al usuario); `PurchasesTable` (columnas, `StatusBadge`, marca "Vencida", enlace a la ficha, estado vacío); `PurchaseDetail` (proveedor, totales con IVA, líneas pedido/recibido/pendiente, motivo si está cancelada); `PurchaseActions` (matriz de botones por cada uno de los 6 estados); `ReceiveDialog` (precarga, topes, error visible, botón deshabilitado mientras corre, demo bloqueada); `alertHref` y enlaces de referencia.
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar** (lista con `Suspense` + esqueleto como `items-list.tsx`; ficha `notFound()` si no existe). Tras cada acción `router.refresh()` y `toast`; Confirmar usa `ConfirmDialog`.
- [ ] **Step 4: Verde** (`npm test`, `typecheck`, `lint`, `build`) y verificación con `next build` + `next start -p 3100` y `fabril_demo=1`: lista, filtro por estado, `?page=999`, ficha de una compra recibida y de una cancelada. Cerrar el servidor. Commit `feat: compras — lista, ficha y acciones`.

---

### Task 3: Producción — lista y ficha (lectura)

**Files:**
- Create: `src/features/production/{types.ts,queries.ts,queries.test.ts}`, `components/{orders-table,order-detail}.tsx` (+ tests), `src/app/app/produccion/[id]/page.tsx`
- Modify: `src/app/app/produccion/page.tsx` (deja `ModulePlaceholder`).

**Interfaces:**
- Produces: `ORDER_TABLE_OPTIONS = { sortable: ["code","priority","plannedEndDate","progress"], filterable: ["estado","prioridad","demorada"], defaultSort: { id: "plannedEndDate", desc: false } }`; `OrderRow` (de `production_order_overview`: `id, code, status, priority, itemId, itemName, itemSku, unitCode, plannedQty, goodQty, defectiveQty, progressPct, isDelayed, plannedStartDate, plannedEndDate`); `listOrders(orgId, params)` (estado/prioridad válidos; `demorada=1` filtra `is_delayed`; búsqueda por código o producto sanitizada; `isOutOfRange`); `getOrder(orgId, id): Promise<{ order: OrderRow & { notes; plannedMaterialCost; plannedLaborCost; plannedOverheadCost; actualMaterialCost|null; actualLaborCost|null; actualOverheadCost|null; actualUnitCost|null; startedAt; completedAt; cancelledAt; cancelReason }; materials; team; reports; events } | null>`; `costVariance(planned: number, actual: number | null): { amount: number; pct: number | null } | null` (puro: `null` sin real; `pct` nulo si lo planificado es 0).
- La ficha enlaza cada producto a `/app/productos/<itemId>` y cada compra generada, si la hubiera, a `/app/compras/<id>`.

- [ ] **Step 1: Tests en rojo.** `costVariance` (más caro, más barato, igual, planificado 0, real nulo); `listOrders`/`getOrder` (mocks); `OrdersTable` (código, producto, producido/planificado, `ProgressBar`, `StatusBadge` con Demorada, fechas, enlace, estado vacío); `OrderDetail` (progreso, materiales requerido/consumido/devuelto/merma, personal, partes, **costos planificado vs real** con total, unitario y desvío $ y % — "más caro"/"más barato" en texto, no sólo color —, historial con `Timeline`, motivo de cancelación).
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar** (mismos patrones que Compras).
- [ ] **Step 4: Verde** + verificación en la demo: lista, `?demorada=1`, ficha de una completada (costos reales) y de una planificada. Commit `feat: producción — lista y ficha`.

---

### Task 4: Producción — nueva orden con vista previa en vivo

**Files:**
- Create: `src/features/production/{schemas.ts,schemas.test.ts,actions.ts,actions.test.ts}`, `components/{order-form,materials-preview}.tsx` (+ tests), `src/app/app/produccion/nueva/page.tsx`; `listEmployees(orgId)`, `listProducibleItems(orgId)` en `queries.ts`.
- Modify: `src/features/dashboard/components/quick-actions.tsx` ("Nueva orden" → `/app/produccion/nueva`).

**Interfaces:**
- Consumes: `create_production_order(p_item, p_planned_qty, p_planned_start, p_planned_end, p_priority, p_responsible, p_employee_ids, p_notes)`; `getBom` (`src/features/items/bom-queries.ts`); `calculateMaterialRequirements`.
- Produces: `orderSchema` (`itemId` uuid, `plannedQty > 0`, `plannedStart`/`plannedEnd` `YYYY-MM-DD`|null con `plannedEnd >= plannedStart`, `priority` en `low|normal|high|urgent`, `responsibleId` uuid|null, `notes` ≤ 500; sin personal asignado extra: sólo el responsable); `createOrder(input)` → `{ id }` (`createAction`, `permission: "manageProduction"`, verifica producto y empleado de la fábrica activa); `listEmployees(orgId): { id; name; position }[]` (activos); `listProducibleItems(orgId): { id; name; sku; unitCode; hasBom }[]`; `MaterialsPreview({ bom: BomView | null, plannedQty: number | null, productUnit })`: sin receta → "Este producto no tiene receta" con enlace a su ficha; con receta y cantidad válida → tabla requerido/disponible/faltante (misma regla que la base) y resumen "Faltan N materiales — la compra se crea desde la orden"; cantidad vacía/0/`NaN` → sin filas ni `NaN`.

- [ ] **Step 1: Tests en rojo.** Esquema (fechas invertidas, cantidad 0, prioridad inválida); acción (demo/sin permiso, producto o empleado ajeno, parámetros exactos de la RPC con `p_employee_ids = []`, "El producto no tiene receta" legible); `MaterialsPreview` (cálculo exacto con desperdicio de la fábrica y de la línea, faltante marcado, sin receta, cantidad inválida); `OrderForm` (elegir producto con receta carga la vista previa, cambiar la cantidad recalcula, producto sin receta deshabilita el envío **y lo explica**, guarda y navega a la ficha, error visible; en la demo se completa y calcula pero el botón dice "No disponible en la demo").
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar.** La página `nueva` precarga un mapa `itemId → BomView | null` de los productos con receta (son pocos): sin llamadas al servidor al cambiar de producto.
- [ ] **Step 4: Verde** + verificación en la demo (`/app/produccion/nueva`: elegir un producto, ver faltantes en vivo). Commit `feat: producción — nueva orden con vista previa de materiales`.

---

### Task 5: Producción — acciones de la ficha

**Files:**
- Create: `components/{order-actions,progress-dialog,complete-dialog,cancel-dialog,shortage-dialog}.tsx` (+ tests); ampliar `schemas.ts`/`actions.ts` y sus tests.
- Modify: `components/order-detail.tsx` (monta las acciones).

**Interfaces:**
- Produces (`createAction`, `permission: "manageProduction"`, verifican que la orden sea de la fábrica activa; mensajes de la base pasan tal cual): `startOrder({ id })` → `start_production_order`; `reportProgress({ id, good ≥ 0, defective ≥ 0 (al menos uno > 0), notes })` → `report_production_progress(p_id, p_good, p_defective, p_employee = null, p_report_date = null, p_notes)`; `completeOrder({ id, good ≥ 0, defective ≥ 0, note })` → si la orden está `in_progress` primero `send_to_quality_check`, luego `complete_production_order(p_id, p_good, p_defective, p_consumptions = [], p_hours = [], p_note)` (la base usa lo consumido al iniciar); si la segunda llamada falla la orden queda en control de calidad y el error se muestra; `cancelOrder({ id, reason (3–200) })` → `cancel_production_order(p_id, p_reason, p_returns = [])`; `createPurchaseFromShortages({ orderId, supplierId })` → `create_purchase_from_shortages` y navega a `/app/compras/<id>`. `OrderActions({ order, materials, suppliers })` por estado: planificada → Iniciar, Cancelar, Crear compra con faltantes (sólo si hay faltantes: algún `available` menor al planificado); en producción → Registrar avance, Completar, Cancelar; control de calidad → Completar, Cancelar; completada/cancelada → nada. `CompleteDialog` precarga las unidades buenas con lo producido hasta ahora (o lo planificado si no hay partes) y las defectuosas con lo reportado.

- [ ] **Step 1: Tests en rojo.** Esquemas (todos en 0, negativos, motivo vacío); acciones (demo/sin permiso, orden ajena, parámetros exactos de cada RPC, `completeOrder` desde `in_progress` llama a las dos RPC en orden y desde `quality_check` sólo a la segunda, falla del segundo paso → error visible, "ya no está planificada/en producción" legible); diálogos (precarga, validaciones, error visible, botón deshabilitado mientras corre, demo bloqueada); `OrderActions` (matriz de botones por cada uno de los 5 estados, sin "Crear compra" si no hay faltantes).
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar**; tras cada acción `router.refresh()` y `toast`; Iniciar usa `ConfirmDialog`. Si el flujo completo (crear → iniciar → avance → completar → costo real) no está cubierto de punta a punta en `supabase/tests/production.test.ts`, agregar ese caso.
- [ ] **Step 4: Verde** + verificación en la demo (botones por estado, diálogos abren, nada guarda). Commit `feat: producción — iniciar, avance, completar, cancelar y compra con faltantes`.

---

### Task 6: Campana de alertas

**Files:**
- Create: `src/components/layout/notifications-menu.test.tsx`
- Modify: `src/components/layout/{notifications-menu,topbar,app-shell}.tsx`.

**Interfaces:**
- Produces: `NotificationsMenu({ alerts: DashboardAlert[] })` lista las alertas (ícono por `kind`, título, detalle, enlace por `href`) con contador sobre la campana (máx. "9+"); sin alertas conserva el estado vacío. `AppShell` obtiene las alertas con `getDashboard(orgId)` (una vez por request, envuelto en `cache` de React; si falla, la campana queda vacía sin romper el panel) y las pasa a `Topbar`.

- [ ] **Step 1: Tests en rojo.** Contador (0 → sin número, 3, 12 → "9+"), lista con los enlaces correctos para los 4 tipos, estado vacío, accesibilidad (`aria-label` con la cantidad), y que un fallo al cargar alertas no rompe el shell.
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar** (quitar el comentario "se alimentan en la Etapa 4").
- [ ] **Step 4: Verde** + verificación en la demo: la campana muestra las alertas del Dashboard y cada una abre su pantalla. Commit `feat: campana de alertas con datos reales`.

---

### Task 7: Capturas reales en la landing

**Files:**
- Create: `scripts/capturas.mts`, `public/capturas/{dashboard,produccion,inventario,recetas,compras,costos}.png`, `src/features/marketing/components/screenshot-frame.test.tsx`
- Modify: `src/features/marketing/components/{screenshot-frame,modules-showcase,hero}.tsx`, `src/features/marketing/content.ts`, `package.json` (`capturas`), `README.md`.

**Interfaces:**
- Produces: `npm run capturas` — con la app corriendo (`PORT` por defecto 3100, `next start`), abre `/demo` con Playwright (Chromium, 1440×900, tema claro, `locale es-AR`) y guarda en `public/capturas/`: `dashboard.png` (`/app`), `produccion.png` (`/app/produccion/nueva` con un producto elegido), `inventario.png` (`/app/inventario`), `recetas.png` (ficha de un producto con receta), `compras.png` (ficha de una compra recibida) y `costos.png` (ficha de una orden completada, costos). Las rutas con ids se resuelven desde las listas. `ScreenshotFrame({ label, src? })`: con `src` muestra `<img>` (`loading="lazy"`, `alt` = `label`, ancho/alto fijos); sin `src` conserva el marco vacío. Cada módulo de `MODULES` gana `screenshot: string`; el hero muestra `dashboard.png`.

- [ ] **Step 1: Tests en rojo** (`screenshot-frame.test.tsx`): con `src` renderiza una imagen con ese `alt`; sin `src` el marco con su texto; el `figcaption` accesible se mantiene; `MODULES` tiene `screenshot` en los 5 módulos con ruta `/capturas/…`; el hero referencia `/capturas/dashboard.png`.
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar** script y componentes. Si Chromium de Playwright falta, `npx playwright install chromium`. Si no se puede descargar o abrir un navegador, **no inventar imágenes**: dejar los marcos vacíos, registrar el motivo como `Ruling` y avisar al usuario con el comando exacto (`npm run capturas`).
- [ ] **Step 4: Verde.** `npm run build && npx next start -p 3100`, `npm run capturas`, **abrir cada PNG y comprobar** que muestra la pantalla correcta (sin esqueletos ni errores); `public/capturas` ≤ 3 MB (optimizar si hace falta). Cerrar el servidor. Commit `feat(landing): capturas reales de la demo`.

---

### Task 8: Cierre del bloque 4B

**Files:** Modify `README.md`, `docs/superpowers/specs/2026-11-22-etapa-4-design.md` (sólo si una decisión cambió); delete `src/components/layout/module-placeholder.tsx` si quedó sin usos.

- [ ] **Step 1:** `grep` de `ModulePlaceholder`; borrar si quedó sin usos. Actualizar el README (estado: Etapa 4 completa; rutas de compras y producción; `npm run capturas`; los recortes como "ideas para retoques").
- [ ] **Step 2:** Verificación completa: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run db:verify` (sin `✗`).
- [ ] **Step 3:** Recorrido en la demo con `next start`: Dashboard → alerta → ficha de orden/compra; campana; Compras (lista, ficha); Producción (lista, ficha, nueva con vista previa); enlaces de movimientos y fichas de ítems a compras/órdenes; ningún 404; `?page=999` en las listas nuevas. Cerrar el servidor.
- [ ] **Step 4:** Commit `chore: cierre del bloque 4B` y **detenerse para la revisión final y la revisión con el autor** (el merge a `main` lo decide el autor).
