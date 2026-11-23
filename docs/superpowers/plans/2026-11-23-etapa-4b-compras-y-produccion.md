# Etapa 4 · Bloque 4B — Compras, Producción, buscador y alertas, capturas · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el ciclo completo funcione sobre la base real —comprar, recibir, planificar, producir y costear— con el buscador `Ctrl+K` y la campana de alertas en vivo, y que la landing muestre capturas reales de la demo.

**Architecture:** Igual que el 4A: lecturas por vistas `security_invoker` (la demo pública las lee como `anon`), escrituras por las RPC transaccionales de la Etapa 3 detrás de `createAction` (que rechaza el modo demo) y formularios que en la demo se abren y calculan pero no guardan (`SubmitButton`). Toda consulta de servidor filtra por la fábrica activa. Lo nuevo en la base: vistas de detalle de compras y producción, `save_purchase_draft` (borrador atómico), `search_entities` (buscador) y el cierre de autores (`created_by`/`actor_id`) para `anon`.

**Tech Stack:** Next.js 16.4.5 (Cache Components, `proxy.ts`), TypeScript, Supabase (PostgREST, RLS, RPC), PGlite, Vitest + Testing Library, Zod 4, React Hook Form, Playwright (capturas), shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-11-22-etapa-4-design.md` (secciones 5.9, 5.10, 5.11, 5.13). Continúa el bloque 4A (`docs/superpowers/plans/2026-11-23-etapa-4a-demo-publica-y-catalogo.md`, ya en `main`).

## Global Constraints

- Leer la guía correspondiente en `node_modules/next/dist/docs/` antes de escribir código de Next (AGENTS.md). Cache Components: `cookies()`/`headers()`/`params`/`searchParams` dentro de `<Suspense>`; verificar cada tarea con `npm run build`.
- UI en español rioplatense, formato argentino (`src/lib/format.ts`). Sin claves privadas en el frontend; la clave secreta nunca en la demo. Lógica crítica en la base (RPC/RLS); control de acceso en interfaz **y** backend.
- No modificar migraciones aplicadas: todo cambio de esquema va en migraciones nuevas (siguen `20261123000800`), que repiten al final el patrón `revoke execute on all functions in schema private from public, anon, authenticated; grant execute on function private.user_org_ids(), private.user_admin_org_ids(), private.colleague_ids(), private.is_draft_purchase(uuid), private.is_active_production(uuid), private.uuid_or_null(text) to authenticated; grant execute on function private.public_demo_org_id() to anon, authenticated;`.
- Supabase en la nube rechaza `UPDATE`/`DELETE` sin `WHERE` (`safeupdate.test.ts` lo vigila). Aplicar cada migración a la nube (`npm run db:push`), regenerar tipos (`npm run db:types` + `npx prettier --write src/types/database.ts`) y correr `npm run db:verify`.
- **Lecciones del 4A que valen para todo el bloque:**
  - Toda consulta de servidor recibe `orgId` (fábrica activa) y filtra por `organization_id`: RLS deja ver todas las fábricas del usuario más la demo pública.
  - Las listas con `count: "exact"` tratan `PGRST103` (página fuera de rango) con `isOutOfRange` de `@/lib/db-errors` y terminan en la última página (patrón de `src/features/items/queries.ts`).
  - Una acción verifica que el registro sea de la fábrica activa antes de llamar a la RPC (patrón de `src/features/inventory/actions.ts`).
  - Las vistas nuevas son `security_invoker` y no exponen `created_by`/`actor_id` a `anon`.
  - Filtros de texto: `sanitizeSearch` (`src/features/items/search.ts`) antes de armar cualquier `.or(...)`.
  - Cada formulario usa `SubmitButton` (`permission` correspondiente), muestra el error del servidor en `FormAlert` y hace `router.refresh()` al guardar.
  - Los tests de acciones/consultas mockean `@/lib/supabase/server` con `vi.mock` (ver `src/features/inventory/*.test.ts`); los de componentes con jsdom necesitan el polyfill de `ResizeObserver`.
  - Los ids de prueba tienen que ser UUID válidos (los esquemas usan `z.uuid()`).
- Cada tarea termina con `npm test`, `npm run typecheck`, `npm run lint` y `npm run build` en verde, y un commit en español con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Las claves/tokens no se piden por el chat.

## Review Focus

1. **Recepción de compras**: recibir más de lo pendiente, cantidad 0, decimales en una unidad entera, o una línea ajena → el servidor lo rechaza con un mensaje legible y nunca queda un estado inconsistente (stock, recibido, estado de la orden).
2. **Doble envío** en acciones críticas (Confirmar, Recibir, Iniciar, Completar, Cancelar): el botón se deshabilita mientras corre y, si igual llega la segunda, la base responde "ya no está en ese estado" y la interfaz lo muestra (no un error genérico).
3. **Orden de producción de un producto sin receta o sin materiales disponibles**: "Nueva orden" lo explica antes de enviar (receta faltante, faltantes de materiales), no sólo con el error de la base.
4. **Buscador con entradas hostiles**: `% _ , ( ) * ' " \`, texto de 1 carácter, de 300 caracteres, y en modo demo (`anon`); nunca devuelve resultados de otra fábrica ni rompe la consulta.
5. **Demo y enlaces**: toda acción de escritura queda deshabilitada pero los formularios abren y la vista previa calcula; ningún enlace nuevo (alertas, movimientos, fichas, buscador) lleva a un 404.

---

## Estructura de archivos

**Base de datos**: `supabase/migrations/20261123000900_purchasing_views.sql`, `…001000_production_views.sql`, `…001100_save_purchase_draft.sql`, `…001200_search_entities.sql`, `…001300_anon_no_authors.sql`; tests `supabase/tests/{purchasing-views,production-views,save-purchase-draft,search-entities,anon-no-authors}.test.ts`.

**Compras** (`src/features/purchasing/`): `types.ts`, `queries.ts`, `schemas.ts`, `actions.ts`, `components/{purchases-table,purchase-detail,purchase-editor,receive-dialog,reverse-receipt-dialog,cancel-dialog}.tsx`; páginas `src/app/app/compras/{page,nueva/page,[id]/page,[id]/editar/page}.tsx`.

**Producción** (`src/features/production/`, además de `logic.ts`): `types.ts`, `queries.ts`, `schemas.ts`, `actions.ts`, `components/{orders-table,order-detail,order-form,materials-preview,order-actions,progress-dialog,complete-dialog,cancel-dialog,shortage-dialog}.tsx`; páginas `src/app/app/produccion/{page,nueva/page,[id]/page}.tsx`.

**Shell**: `src/lib/actions.ts` (`createReadAction`), `src/features/search/{actions,schemas}.ts`, `src/components/layout/{command-menu,notifications-menu,topbar,app-shell}.tsx`, `src/features/dashboard/data.ts` (`alertHref`), `src/features/dashboard/components/quick-actions.tsx`.

**Capturas**: `scripts/capturas.mts`, `public/capturas/*.png`, `src/features/marketing/components/{screenshot-frame,modules-showcase,hero}.tsx`.

---

### Task 1: Base de datos — vistas de compras y producción, borrador atómico, buscador y autores

**Files:**
- Create: las 5 migraciones y los 5 tests de "Estructura de archivos".
- Modify: `src/types/database.ts` (regenerado).

**Interfaces (todo `security_invoker`, `grant select … to anon, authenticated`, sin `created_by`/`actor_id`):**
- `public.purchase_overview`: `id, organization_id, code, status, order_date, expected_date, notes, subtotal, tax_total, total, cancel_reason, supplier_id, supplier_name, line_count int, received_pct int (0–100: Σ received_qty / Σ quantity), is_late boolean` (`status in ('pending','partially_received')` y `expected_date` anterior al hoy de la fábrica).
- `public.purchase_line_details`: `id, organization_id, purchase_order_id, item_id, item_name, item_sku, unit_code, quantity, unit_price, tax_rate, received_qty, pending_qty (≥ 0), line_total (quantity × unit_price, 2 decimales, sin IVA)`.
- `public.purchase_receipt_line_details`: `receipt_id, organization_id, purchase_order_id, received_at, delivery_note_number, receipt_notes, receipt_line_id, purchase_order_line_id, item_id, item_name, unit_code, quantity, reversed_qty`.
- `public.production_material_details`: `id, organization_id, production_order_id, item_id, item_name, item_sku, unit_code, planned_qty, consumed_qty, returned_qty, scrap_qty, waste_pct, cost_consumed, available (de item_stock_status)`.
- `public.production_team`: `id, organization_id, production_order_id, employee_id, first_name, last_name, position, role_in_order, hours_worked`.
- `public.production_report_details`: `id, organization_id, production_order_id, report_date, good_qty, defective_qty, notes, created_at, employee_name`.
- `public.production_event_details`: `id, organization_id, production_order_id, from_status, to_status, note, occurred_at`.
- `public.movement_feed` (se **recrea** con `create or replace`, agregando al final): `reference_type text` (`'purchase_order'|'production_order'|null`) y `reference_id uuid`.
- `public.save_purchase_draft(p_id uuid, p_supplier uuid, p_order_date date, p_expected_date date, p_notes text, p_lines jsonb) returns uuid` — `security definer`, `require_role(org, '{admin}')`; `p_id` nulo crea, no nulo edita **sólo si está en borrador** (`P0001` "Sólo se puede editar una orden en borrador"); proveedor y materias primas de la misma fábrica (`P0001`); `p_lines = [{ "itemId": uuid, "quantity": num > 0, "unitPrice": num ≥ 0, "taxRate": 0|10.5|21|27 }]`, al menos una, sin ítems repetidos; reemplaza las líneas en una transacción; devuelve el id; `revoke … from public, anon; grant … to authenticated`.
- `public.search_entities(p_org uuid, p_q text) returns table (kind text, id uuid, label text, sublabel text, item_type text)` — `security invoker`; `p_q` recortado, mínimo 2 y máximo 100 caracteres (si no, vacío), con `%`, `_` y `\` escapados; hasta 8 resultados por tipo (`'item'` por SKU/nombre sin archivados, `'production_order'` por código o nombre del producto, `'purchase_order'` por código o proveedor), ordenados por tipo y relevancia (empieza con el texto primero); `grant execute … to anon, authenticated`.
- Cierre de autores: para cada tabla con `grant select … to anon` de la migración `…000100` que tenga columnas `created_by` o `actor_id`, reemplazar el `grant select` de tabla por `grant select (todas menos esas) … to anon`.

- [ ] **Step 1: Tests en rojo** (estilo `catalog-rules.test.ts`/`item-views.test.ts`; armar la fábrica con las RPC reales: compra con 2 líneas recibida parcialmente, orden de producción creada e iniciada, con parte de avance). Casos con valores exactos:
  - `purchase_overview`: `received_pct` 50 tras recibir la mitad, `is_late` verdadero sólo en `pending/partially_received` con fecha vencida (y falso en `received`/`cancelled`), `supplier_name`, `line_count`; otra fábrica no ve nada.
  - `purchase_line_details`: `pending_qty` = pedido − recibido; `line_total` sin IVA; `purchase_receipt_line_details` refleja `reversed_qty` tras revertir.
  - `production_*`: materiales con `available`, equipo con nombres, partes con `employee_name`, eventos en orden.
  - `movement_feed.reference_type/reference_id` correctos para compra y producción y nulos para manuales.
  - `save_purchase_draft`: crea con código `OC-AAAA-NNNN`, edita reemplazando líneas, rechaza: orden confirmada, proveedor/ítem de otra fábrica, ítem que no es materia prima, líneas vacías o repetidas, cantidad 0, IVA 5, usuario ajeno y `anon` (`permission denied`).
  - `search_entities`: encuentra por SKU, nombre, código de OP/OC y proveedor; `'%'`, `'_'`, `'\'`, `"a,b"` y 300 caracteres no devuelven filas ajenas ni lanzan; 1 carácter → vacío; otra fábrica → vacío; `anon` sólo ve la demo pública.
  - `anon-no-authors`: recorrer `information_schema.column_privileges` para `anon` y afirmar que ninguna columna llamada `created_by` o `actor_id` es legible en `public`; y que las demás columnas de `items`, `activity_log` y `production_orders` siguen legibles.
- [ ] **Step 2: Verificar rojo** (`npx vitest run supabase/tests/<archivo>`: falla por objetos inexistentes).
- [ ] **Step 3: Implementar las 5 migraciones** (una por tema, con el patrón final de `revoke`/`grant`; sin `UPDATE`/`DELETE` sin `WHERE`; `is_late` y fechas con `(now() at time zone o.timezone)::date`). Ajustar los tests existentes que lean columnas de autor como `anon`.
- [ ] **Step 4: Verde**: `npm run test:db` completo. Aplicar a la nube, regenerar tipos, `npm run db:verify` sin `✗`. Commit `feat(db): vistas de compras y producción, save_purchase_draft, search_entities y demo sin autores`.

---

### Task 2: Compras — lista y ficha (lectura)

**Files:**
- Create: `src/features/purchasing/{types.ts,queries.ts,queries.test.ts}`, `components/{purchases-table,purchase-detail}.tsx` (+ tests), `src/app/app/compras/[id]/page.tsx`
- Modify: `src/app/app/compras/page.tsx` (deja `ModulePlaceholder`), `src/features/dashboard/data.ts` (`alertHref`) y su test, `src/features/inventory/components/movements-table.tsx` + `src/features/items/components/item-movements.tsx` (la referencia pasa a enlace), `src/features/inventory/types.ts`/`movement-row.ts` (`referenceType`, `referenceId`), `src/features/items/components/item-related.tsx` (`PurchaseHistory` enlaza a la ficha).

**Interfaces:**
- Produces: `PURCHASE_TABLE_OPTIONS = { sortable: ["code","orderDate","expectedDate","total"], filterable: ["estado","proveedor"], defaultSort: { id: "orderDate", desc: true } }`; `PurchaseRow` (campos de `purchase_overview` en camelCase); `listPurchases(orgId, params: TableParams): Promise<{ rows: PurchaseRow[]; total: number }>` (búsqueda por código o proveedor con `sanitizeSearch`, estados válidos únicamente, `isOutOfRange`); `listSupplierOptions(orgId)` (reutiliza `listSuppliers` de `items/detail-queries`); `getPurchase(orgId, id): Promise<{ purchase: PurchaseRow; lines: PurchaseLineDetail[]; receipts: PurchaseReceipt[] } | null>` (`receipts` agrupa `purchase_receipt_line_details` por recepción, de la más nueva a la más vieja; UUID inválido → `null` sin consultar).
- `alertHref`: `late_purchase` → `/app/compras/<entityId>`, `delayed_order` → `/app/produccion/<entityId>`.
- La referencia de un movimiento enlaza a `/app/compras/<id>` o `/app/produccion/<id>` según `referenceType`.

- [ ] **Step 1: Tests en rojo**: `listPurchases` (filtra por fábrica y estado válido, descarta estados/proveedores inválidos, orden por columna permitida, búsqueda sanitizada, `PGRST103` → última página); `getPurchase` (agrupa recepciones, `null` si no existe o id inválido); `PurchasesTable` (columnas código, proveedor, total, entrega esperada, estado con `StatusBadge kind="purchase"`, marca "Vencida" cuando `isLate`, enlace a la ficha, "Nueva compra" visible también en la demo, estado vacío); `PurchaseDetail` (cabecera con proveedor y totales con IVA, tabla de líneas con pedido/recibido/pendiente, recepciones con remito y fecha, motivo de cancelación si está cancelada); tests de `alertHref` y de que la referencia de un movimiento renderiza un `<a>` con el `href` correcto.
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar** consultas, componentes y páginas (lista con `Suspense` + esqueleto como `items-list.tsx`; ficha `notFound()` si `getPurchase` devuelve `null`). Los botones de acción de la ficha se agregan en la Task 4: acá la cabecera sólo muestra el estado.
- [ ] **Step 4: Verde** (`npm test`, `typecheck`, `lint`, `build`) y verificación con `next build` + `next start -p 3100` y la cookie `fabril_demo=1`: lista, filtros por estado y `?page=999` (última página, sin romper), ficha de una compra recibida y de una cancelada. Cerrar el servidor. Commit `feat: compras — lista y ficha`.

---

### Task 3: Compras — nueva y editar borrador

**Files:**
- Create: `src/features/purchasing/{schemas.ts,schemas.test.ts,actions.ts,actions.test.ts}`, `components/{purchase-editor.tsx,purchase-editor.test.tsx}`, `src/app/app/compras/nueva/page.tsx`, `src/app/app/compras/[id]/editar/page.tsx`

**Interfaces:**
- Consumes: `save_purchase_draft` (Task 1); `listSupplierOptions`, `getPurchase` (Task 2); `listRawMaterialOptions` (`src/features/items/bom-queries.ts`); `SubmitButton`, `FormField`, `NumberInput`, `MoneyInput`.
- Produces: `purchaseDraftSchema` (`supplierId` uuid, `orderDate` `YYYY-MM-DD`, `expectedDate` `YYYY-MM-DD`|null con `expectedDate >= orderDate`, `notes` ≤ 500, `lines` ≥ 1 con `itemId` uuid, `quantity > 0`, `unitPrice ≥ 0`, `taxRate` en `0|10.5|21|27`, sin ítems repetidos); `TAX_RATES = [0, 10.5, 21, 27] as const`; `calcPurchaseTotals(lines): { subtotal; taxTotal; total }` (puro, redondeo a 2 decimales como la base: IVA por línea redondeado y sumado); `saveDraftPurchase({ id?: string, ...purchaseDraftSchema })` → `{ id }` (`createAction`, `permission: "managePurchasing"`, verifica proveedor de la fábrica activa y, al editar, que la orden sea de la fábrica activa); `PurchaseEditor({ initial?, suppliers, materials })` (página completa, no diálogo).

- [ ] **Step 1: Tests en rojo.** `calcPurchaseTotals` (3 líneas con IVA mixto, redondeo exacto, lista vacía → ceros, nunca `NaN`); esquema (fecha esperada anterior a la del pedido, línea repetida, IVA 5, cantidad 0, precio negativo); acción (demo y sin permiso rechazan, proveedor ajeno, llamada a la RPC con los parámetros exactos, mensaje de negocio de la base pasa tal cual, `revalidatePath`); componente (total en vivo al cambiar cantidad/precio/IVA, no ofrece materias primas ya elegidas, guarda y navega a la ficha, error del servidor visible, en la demo se completa pero el botón dice "No disponible en la demo" y el total sigue calculando, editar precarga las líneas).
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar.** Página `nueva` redirige a la ficha del borrador tras guardar; `editar` hace `notFound()` si la orden no existe y redirige a la ficha si ya no está en borrador. Botón "Guardar borrador" y enlace "Cancelar".
- [ ] **Step 4: Verde** + verificación manual en la demo (`/app/compras/nueva` abre, calcula, no guarda). Commit `feat: compras — nueva orden y edición de borrador`.

---

### Task 4: Compras — confirmar, recibir, revertir y cancelar

**Files:**
- Create: `components/{receive-dialog,reverse-receipt-dialog,cancel-dialog,purchase-actions}.tsx` (+ tests); ampliar `schemas.ts`/`actions.ts` y sus tests.
- Modify: `components/purchase-detail.tsx` (monta las acciones).

**Interfaces:**
- Produces (`createAction`, `permission: "managePurchasing"`, verifican que la orden/recepción sea de la fábrica activa; mensajes de la base pasan tal cual): `confirmPurchase({ id })` → `confirm_purchase_order`; `receivePurchase({ id, deliveryNote: string (≤ 40, opcional), receivedAt: YYYY-MM-DD (no futura), lines: [{ lineId: uuid, quantity: num > 0 }] })` → `receive_purchase_order(p_id, p_delivery_note, p_received_at, p_lines = [{ line_id, quantity }])`; `reversePurchaseReceipt({ receiptId, reason (obligatorio, 3–200), lines: [{ receiptLineId, quantity }] })` → `reverse_purchase_receipt`; `cancelPurchase({ id, reason })` → `cancel_purchase_order`. `PurchaseActions({ purchase, lines, receipts })` muestra sólo las acciones válidas por estado: borrador → Editar, Confirmar, Cancelar; pendiente/parcial → Recibir, Cancelar; recibida/parcial → Revertir recepción en cada recepción. En la demo todas visibles; los diálogos abren y el botón final dice "No disponible en la demo". Una unidad entera (`u`) no admite cantidades con decimales (`allowsDecimals`).

- [ ] **Step 1: Tests en rojo.** Esquemas (cantidad 0 o negativa, motivo vacío, fecha futura, línea ajena que no es UUID); acciones (por cada una: demo/sin permiso, documento de otra fábrica, parámetros exactos de la RPC, error de base legible, doble envío: la segunda respuesta `P0001` "ya no está…" llega al usuario); diálogos (Recibir precarga lo pendiente por línea y no deja pasar más que lo pendiente ni 0 en todas; Revertir pide motivo; Cancelar pide motivo; todos muestran el error del servidor y no cierran; el botón queda deshabilitado mientras corre — Review Focus 2); `PurchaseActions` por estado (matriz completa de botones visibles por cada uno de los 6 estados).
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar** diálogos y acciones; tras cada acción `router.refresh()` y `toast`. Confirmar usa `ConfirmDialog`; si falla muestra `toast.error` y no lanza.
- [ ] **Step 4: Verde.** Prueba de punta a punta **contra PGlite** en `supabase/tests/purchasing.test.ts`: ya existe; sólo si falta, agregar el caso "recibir dos veces la misma línea no supera lo pedido". Verificación manual en la demo (botones visibles, diálogos abren, nada guarda). Commit `feat: compras — confirmar, recibir, revertir y cancelar`.

---

### Task 5: Producción — lista y ficha (lectura)

**Files:**
- Create: `src/features/production/{types.ts,queries.ts,queries.test.ts}`, `components/{orders-table,order-detail}.tsx` (+ tests), `src/app/app/produccion/[id]/page.tsx`
- Modify: `src/app/app/produccion/page.tsx` (deja `ModulePlaceholder`).

**Interfaces:**
- Produces: `ORDER_TABLE_OPTIONS = { sortable: ["code","priority","plannedEndDate","progress"], filterable: ["estado","prioridad","demorada"], defaultSort: { id: "plannedEndDate", desc: false } }`; `OrderRow` (de `production_order_overview`: `id, code, status, priority, itemId, itemName, itemSku, unitCode, plannedQty, goodQty, defectiveQty, progressPct, isDelayed, plannedStartDate, plannedEndDate`); `listOrders(orgId, params)` (estado/prioridad válidos únicamente; `demorada=1` filtra `is_delayed`; búsqueda por código o producto sanitizada; `isOutOfRange`); `getOrder(orgId, id): Promise<{ order: OrderRow & { notes; plannedMaterialCost; plannedLaborCost; plannedOverheadCost; actualMaterialCost|null; actualLaborCost|null; actualOverheadCost|null; actualUnitCost|null; startedAt; completedAt; cancelledAt; cancelReason }; materials: OrderMaterial[]; team: TeamMember[]; reports: OrderReport[]; events: OrderEvent[] } | null>`; `costVariance(planned: number, actual: number | null): { amount: number; pct: number | null } | null` (puro: `null` si no hay real; `pct` nulo si lo planificado es 0).

- [ ] **Step 1: Tests en rojo.** `costVariance` (real mayor/menor/igual, planificado 0, real nulo); `listOrders` y `getOrder` (mocks, igual que Compras); `OrdersTable` (código, producto, cantidad producida / planificada, `ProgressBar`, `StatusBadge` con marca Demorada, fechas, enlace a la ficha, "Nueva orden" visible en la demo, estado vacío); `OrderDetail` (progreso, tabla de materiales requerido/consumido/devuelto/merma, personal con horas, partes de avance, **costos planificado vs real** con total, unitario y desvío $ y % (verde/rojo no sólo por color: con texto "más caro"/"más barato"), historial de eventos con `Timeline`, motivo de cancelación).
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar** consultas, componentes y páginas (mismos patrones que Compras: `Suspense`, `notFound()`, UUID inválido sin consultar).
- [ ] **Step 4: Verde** + verificación con `next build`/`next start` en la demo: lista, filtro `?demorada=1`, ficha de una completada (con costos reales) y de una planificada. Commit `feat: producción — lista y ficha`.

---

### Task 6: Producción — nueva orden con vista previa en vivo

**Files:**
- Create: `src/features/production/{schemas.ts,schemas.test.ts,actions.ts,actions.test.ts}`, `components/{order-form.tsx,materials-preview.tsx}` (+ tests), `src/app/app/produccion/nueva/page.tsx`; `listEmployees(orgId)`, `listProducibleItems(orgId)` en `queries.ts`.

**Interfaces:**
- Consumes: `create_production_order(p_item, p_planned_qty, p_planned_start, p_planned_end, p_priority, p_responsible, p_employee_ids, p_notes)`; `getBom` (`src/features/items/bom-queries.ts`); `calculateMaterialRequirements`.
- Produces: `orderSchema` (`itemId` uuid, `plannedQty > 0`, `plannedStart`/`plannedEnd` `YYYY-MM-DD`|null con `plannedEnd >= plannedStart`, `priority` en `low|normal|high|urgent`, `responsibleId` uuid|null, `employeeIds` uuid[] sin repetidos, `notes` ≤ 500); `createOrder(input)` → `{ id }` (`createAction`, `permission: "manageProduction"`, verifica que el producto y los empleados sean de la fábrica activa); `listEmployees(orgId): { id; name; position }[]` (activos); `listProducibleItems(orgId): { id; name; sku; unitCode; hasBom: boolean }[]`; `MaterialsPreview({ bom: BomView | null, plannedQty: number | null, productUnit })`: sin receta → mensaje "Este producto no tiene receta" con enlace a su ficha; con receta y cantidad válida → tabla requerido/disponible/faltante (misma regla que la base) y resumen "Faltan N materiales — podés crear la compra desde la orden"; cantidad vacía/0/`NaN` → sin filas ni `NaN`.

- [ ] **Step 1: Tests en rojo.** Esquema (fechas invertidas, cantidad 0, prioridad inválida, empleado repetido); acción (demo/sin permiso, producto de otra fábrica, empleado ajeno, parámetros exactos de la RPC, error "El producto no tiene receta" legible); `MaterialsPreview` (cálculo exacto con desperdicio de la fábrica y de la línea, faltante marcado, sin receta, cantidad inválida — Review Focus 3); `OrderForm` (al elegir producto con receta carga la vista previa, al cambiar la cantidad recalcula, un producto sin receta deshabilita el envío **y lo explica**, guarda y navega a la ficha, error del servidor visible; en la demo se completa y calcula pero el botón dice "No disponible en la demo").
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar.** La vista previa necesita la receta del producto elegido: la página `nueva` pasa un mapa `itemId → BomView | null` precargado de los productos con receta (son pocos); sin llamadas al servidor al cambiar de producto.
- [ ] **Step 4: Verde** + verificación manual en la demo (`/app/produccion/nueva`: elegir un producto, ver faltantes en vivo). Commit `feat: producción — nueva orden con vista previa de materiales`.

---

### Task 7: Producción — acciones de la ficha

**Files:**
- Create: `components/{order-actions,progress-dialog,complete-dialog,cancel-dialog,shortage-dialog}.tsx` (+ tests); ampliar `schemas.ts`/`actions.ts` y sus tests.
- Modify: `components/order-detail.tsx` (monta las acciones).

**Interfaces:**
- Produces (`createAction`, `permission: "manageProduction"`, verifican que la orden sea de la fábrica activa; mensajes de la base pasan tal cual): `startOrder({ id })` → `start_production_order`; `reportProgress({ id, good ≥ 0, defective ≥ 0 (al menos uno > 0), employeeId|null, reportDate|null, notes })` → `report_production_progress`; `sendToQuality({ id })` → `send_to_quality_check`; `returnToProduction({ id, note })` → `return_to_production`; `completeOrder({ id, good, defective, consumptions: [{ itemId, quantity ≥ 0 }], hours: [{ employeeId, hours ≥ 0 }], note })` → `complete_production_order(p_consumptions = [{ item_id, quantity }], p_hours = [{ employee_id, hours }])`; `cancelOrder({ id, reason (obligatorio), returns: [{ itemId, quantity ≥ 0 }] })` → `cancel_production_order(p_returns = [{ item_id, quantity }])`; `createPurchaseFromShortages({ orderId, supplierId })` → `create_purchase_from_shortages` y navega a la compra creada. `OrderActions({ order, materials, team, suppliers })` muestra sólo lo válido por estado: planificada → Iniciar, Cancelar, Crear compra con faltantes (si hay faltantes); en producción → Registrar avance, Enviar a calidad, Completar, Cancelar; calidad → Volver a producción, Completar, Cancelar; completada/cancelada → nada. `CompleteDialog` precarga consumos reales con lo planificado y las horas con las asignadas; `CancelDialog` ofrece devolver a stock lo no consumido.

- [ ] **Step 1: Tests en rojo.** Esquemas (todos en 0, negativos, motivo vacío); acciones (demo/sin permiso, orden ajena, parámetros exactos de cada RPC con los nombres `item_id`/`employee_id`, "ya no está planificada/en producción" legible — Review Focus 2); diálogos (precarga, validaciones, error del servidor visible, botón deshabilitado mientras corre, demo bloqueada); `OrderActions` (matriz de botones por cada uno de los 5 estados, incluida la ausencia de "Crear compra" sin faltantes).
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar** diálogos y acciones; tras cada acción `router.refresh()` y `toast`; Iniciar/Enviar a calidad usan `ConfirmDialog`.
- [ ] **Step 4: Verde.** Si el flujo completo (crear → iniciar → avance → completar → costo real) no está cubierto de punta a punta en `supabase/tests/production.test.ts`, agregar ese caso. Verificación manual en la demo (botones visibles por estado, diálogos abren, nada guarda). Commit `feat: producción — iniciar, avance, calidad, completar, cancelar y compra con faltantes`.

---

### Task 8: Buscador `Ctrl+K` y campana de alertas

**Files:**
- Create: `src/features/search/{schemas.ts,schemas.test.ts,actions.ts,actions.test.ts}`; tests de `command-menu` y `notifications-menu`.
- Modify: `src/lib/actions.ts` (+ test), `src/components/layout/{command-menu,notifications-menu,topbar,app-shell}.tsx`, `src/features/dashboard/components/quick-actions.tsx`.

**Interfaces:**
- Produces: `createReadAction({ schema, handler })` en `src/lib/actions.ts`: igual que `createAction` pero **permite el modo demo** (sólo lectura): exige sesión (real o demo), valida con Zod y entrega `ActionContext`; no admite `permission`. `searchSchema = z.object({ q: z.string().trim().max(100) })`; `searchEntities({ q })` (`createReadAction`) → `SearchResult[]` (`{ kind: "item"|"production_order"|"purchase_order"; id; label; sublabel; href }`; `q` de menos de 2 caracteres → `[]` sin consultar; llama a `search_entities(p_org = fábrica activa, p_q = q)`; `href` por tipo: ítem → `/app/productos/<id>` o `/app/materias-primas/<id>` según `item_type`, orden de producción → `/app/produccion/<id>`, compra → `/app/compras/<id>`). `CommandMenu` agrega el grupo "Resultados" con debounce de 250 ms, descarta respuestas viejas y mantiene los grupos de módulos y temas; las acciones rápidas "Nuevo producto", "Nueva orden de producción" (`/app/produccion/nueva`) y "Nueva compra" (`/app/compras/nueva`). `NotificationsMenu({ alerts: DashboardAlert[] })` lista las alertas reales (ícono, título, detalle, enlace) con contador en la campana; sin alertas muestra el estado vacío actual. `AppShell` obtiene las alertas de `getDashboard`/`dashboard_data` (una vez por request, con `cache` de React) y las pasa a `Topbar`.

- [ ] **Step 1: Tests en rojo.** `createReadAction` (sesión demo pasa, sin sesión redirige, entrada inválida devuelve `fieldErrors`, no revalida ni permite `permission`); `searchEntities` (demo permitida, `q` corto → `[]` sin llamar a la base, hostil `"%_\\,()*'\""` pasa tal cual a la RPC sin romper, mapea `href` por tipo, error de base legible); `CommandMenu` (escribir 2+ caracteres muestra resultados con su enlace, respuestas fuera de orden no pisan a la última, 1 carácter no consulta, error de red no rompe el menú, sigue ofreciendo módulos y temas, en la demo no ofrece Configuración); `NotificationsMenu` (contador, lista con enlaces correctos, vacío); `QuickActions` (enlaces a `/app/productos?nuevo=1`, `/app/compras/nueva`, `/app/produccion/nueva`).
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar.** Quitar el texto "se agrega en la Etapa 4" de los comentarios.
- [ ] **Step 4: Verde** + verificación con `next build`/`next start` en la demo: la campana muestra las alertas del Dashboard, el HTML del buscador carga; probar `searchEntities` con una búsqueda real contra la nube (`PEAD`, `OP-2026`, `Petroquímica`) desde un script efímero y confirmar que no devuelve filas de otra fábrica. Commit `feat: buscador Ctrl+K y campana de alertas con datos reales`.

---

### Task 9: Capturas reales en la landing

**Files:**
- Create: `scripts/capturas.mts`, `public/capturas/{dashboard,produccion,inventario,recetas,compras,costos}.png`, `src/features/marketing/components/screenshot-frame.test.tsx`
- Modify: `src/features/marketing/components/{screenshot-frame,modules-showcase,hero}.tsx`, `src/features/marketing/content.ts`, `package.json` (`capturas`), `README.md`.

**Interfaces:**
- Produces: `npm run capturas` — con la app corriendo (`PORT` por defecto 3100, `next start`), abre `/demo` con Playwright (Chromium, ventana 1440×900, tema claro, `locale es-AR`) y guarda en `public/capturas/`: `dashboard.png` (`/app`), `produccion.png` (orden con vista previa de materiales: `/app/produccion/nueva` con un producto elegido), `inventario.png` (`/app/inventario`), `recetas.png` (ficha de un producto con receta, sección Receta), `compras.png` (ficha de una compra recibida) y `costos.png` (ficha de una orden completada, sección de costos). Las rutas con ids se resuelven desde la lista (primer enlace que cumpla). `ScreenshotFrame({ label, src? })`: con `src` muestra `<img>` (`loading="lazy"`, `alt` = `label`, ancho/alto fijos para evitar saltos); sin `src` conserva el marco vacío. Cada módulo de `MODULES` gana `screenshot: string`; el hero muestra `dashboard.png`.

- [ ] **Step 1: Tests en rojo** (`screenshot-frame.test.tsx`): con `src` renderiza una imagen con ese `alt`; sin `src` renderiza el marco con su texto; el `figcaption` accesible se mantiene; `MODULES` tiene `screenshot` para los 5 módulos y cada ruta empieza con `/capturas/`; el hero referencia `/capturas/dashboard.png`.
- [ ] **Step 2: Verificar rojo.**
- [ ] **Step 3: Implementar** el script y los componentes. Si Chromium de Playwright no está instalado, `npx playwright install chromium`. Si no se puede descargar o abrir un navegador, **no inventar imágenes**: dejar los marcos vacíos, registrar el motivo en el ledger como `Ruling` y avisar al usuario con el comando exacto para generarlas (`npm run capturas`).
- [ ] **Step 4: Verde.** Correr `npm run build && npx next start -p 3100`, `npm run capturas`, **abrir cada PNG y comprobar** que muestra la pantalla correcta (sin esqueletos de carga ni errores); peso total de `public/capturas` ≤ 3 MB (optimizar si hace falta). Commit `feat(landing): capturas reales de la demo`.

---

### Task 10: Cierre del bloque 4B

**Files:**
- Modify: `README.md`, `docs/superpowers/specs/2026-11-22-etapa-4-design.md` (sólo si una decisión cambió).
- Delete (si ya no tiene usos): `src/components/layout/module-placeholder.tsx`.

- [ ] **Step 1:** `grep` de `ModulePlaceholder`; borrar el componente si quedó sin usos. Actualizar el README (estado: Etapa 4 completa; rutas de compras y producción; `npm run capturas`).
- [ ] **Step 2:** Verificación completa: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run db:verify` (sin `✗`).
- [ ] **Step 3:** Recorrido en la demo con `next start`: Dashboard → alerta → ficha de la orden/compra; buscador; Compras (lista, ficha, nueva); Producción (lista, ficha, nueva con vista previa); enlaces de movimientos y fichas de ítems a compras/órdenes; ningún 404; `?page=999` en las listas nuevas. Cerrar el servidor.
- [ ] **Step 4:** Commit `chore: cierre del bloque 4B` y **detenerse para la revisión final y la revisión con el autor** (el merge a `main` lo decide el autor).
