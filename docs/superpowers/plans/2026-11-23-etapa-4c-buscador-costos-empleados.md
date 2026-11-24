# Etapa 4C — Buscador, Costos, Empleados y CSV · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar la Etapa 4 con lo mínimo vistoso para el portfolio: buscador global, pantalla de Costos (lectura), lista simple de Empleados con alta/edición y exportación a CSV.

**Architecture:** Mismo patrón que 4A/4B: consultas por organización en `src/features/<módulo>/queries.ts` (RLS + filtro explícito de `organization_id`), acciones con `createAction` (rechaza la demo), páginas con `<Suspense>` (Cache Components), TDD. Las exportaciones son route handlers `GET` protegidos por la sesión (la demo puede leer). El buscador es un route handler JSON consumido por el menú de comandos.

**Tech Stack:** Next.js 16.4.5 (leer `node_modules/next/dist/docs/` ante dudas de API), TypeScript, Supabase (RLS, vistas `security_invoker`), RHF + Zod, shadcn/ui, Vitest, PGlite.

**Spec:** `docs/superpowers/specs/2026-11-22-etapa-4-design.md` y `docs/plan-tecnico.md` §10. Recortes aprobados por el autor ("Si vamos con el recorte"): sin pantalla de Proveedores, sin Reportes con gráficos propios, sin ficha de empleado, sin asignar personal ni cargar horas.

## Global Constraints

- Sin credenciales en el frontend; nada crítico sólo en el cliente: toda escritura valida en servidor y la base (RLS/grants) la respalda.
- La demo pública usa `anon` de sólo lectura: ninguna escritura, `created_by`/`actor_id` nunca visibles. Las exportaciones y el buscador funcionan en la demo (son lecturas).
- Toda consulta filtra por `organization_id` de la sesión activa.
- Textos en español rioplatense (voseo); dinero con `formatMoney`, cantidades con `formatQuantity`.
- Cada migración repite el patrón final `revoke execute … private` / `grant …` y los `grant execute on function private.public_demo_org_id()` ya usados.
- Supabase cloud rechaza UPDATE/DELETE sin WHERE.

## Review Focus

1. **Buscador con caracteres especiales** (`%`, `,`, `(`, `)`, `"`, `\`, términos vacíos o de 1 letra): no rompe el filtro `.or()` ni devuelve error; nunca aparecen registros de otra fábrica.
2. **CSV**: celdas que empiezan con `=`, `+`, `-`, `@` (inyección de fórmulas), comas, comillas y saltos de línea en nombres; tildes y ñ se abren bien en Excel (BOM UTF-8); sin `created_by`.
3. **Empleados**: la demo no escribe; un id de otra fábrica se rechaza; costo por hora vacío o negativo; un empleado inactivo no aparece como responsable en Nueva orden.
4. **Costos**: producto sin receta muestra "—" (no 0 ni margen falso); precio 0 no divide por cero; sin órdenes completadas hay estado vacío.
5. **Enlaces y navegación**: buscador, menú lateral y exportaciones sin 404; `?page=999` en Empleados.

---

## Estructura de archivos

- **Base de datos:** `supabase/migrations/20261123001200_employees_update.sql` (grant update por columnas de `employees`); test `supabase/tests/employees.test.ts`.
- **Buscador:** `src/features/search/{queries.ts,queries.test.ts}`, `src/app/app/buscar/route.ts`, cambios en `src/components/layout/command-menu.tsx` (+ test).
- **Costos:** `src/features/costs/{types.ts,queries.ts,components/costs-view.tsx,components/costs-table.tsx,components/deviation-table.tsx}`, `src/app/app/costos/page.tsx`, `src/lib/navigation.ts`.
- **Empleados:** `src/features/employees/{types.ts,queries.ts,schemas.ts,actions.ts,components/employees-view.tsx,components/employees-table.tsx,components/employee-dialog.tsx}`, `src/app/app/empleados/page.tsx`.
- **CSV:** `src/lib/csv.ts` (+ test), `src/components/data/export-button.tsx`, route handlers `src/app/app/{inventario,costos,produccion}/exportar/route.ts`.

---

### Task 1: Buscador global

**Files:**
- Create: `src/features/search/queries.ts`, `src/features/search/queries.test.ts`, `src/app/app/buscar/route.ts`
- Modify: `src/components/layout/command-menu.tsx`, `src/components/layout/command-menu.test.tsx`

**Interfaces:**
- Consumes: `sanitizeSearch(term: string): string` de `@/features/items/search`; vistas `item_catalog`, `production_order_overview`, `purchase_overview`; `requireSession()`.
- Produces: `type SearchHit = { kind: "product" | "raw_material" | "order" | "purchase"; id: string; title: string; detail: string; href: string }` y `searchRecords(orgId: string, term: string): Promise<SearchHit[]>` (máx. 5 por tipo; `[]` si el término sanitizado tiene menos de 2 caracteres). `GET /app/buscar?q=` responde `{ hits: SearchHit[] }` (sesión requerida; funciona en demo).

- [ ] **Step 1: Tests en rojo** (`queries.test.ts`, con el cliente de Supabase simulado como en `purchasing/queries.test.ts`):
  - `searchRecords(org, "balde")` consulta las 3 vistas con `organization_id = org` y arma los hrefs `/app/productos/<id>`, `/app/materias-primas/<id>`, `/app/produccion/<id>`, `/app/compras/<id>`.
  - Término de 1 letra o sólo espacios → `[]` sin consultar.
  - Término `a,b)(%"\` llega sanitizado al filtro (sin `,` ni `(` ni `)` sin escapar) y no lanza.
  - Un error de la base se propaga.
- [ ] **Step 2: Verificar rojo.** Run: `npx vitest run src/features/search` — Expected: FAIL (módulo inexistente).
- [ ] **Step 3: Implementar** `searchRecords` (cuatro consultas en paralelo con `Promise.all`, `limit(5)`, `ilike` sobre nombre/sku y código) y el route handler (`requireSession`, `q` máx. 60 caracteres).
- [ ] **Step 4: Test en rojo del menú** (`command-menu.test.tsx`): al escribir 2+ letras llama a `fetch("/app/buscar?q=…")` (con debounce, `fetch` simulado), muestra los resultados agrupados ("Productos", "Materias primas", "Órdenes", "Compras") y al elegir uno navega a su `href`; con menos de 2 letras no llama a `fetch`; sin resultados muestra "No hay coincidencias."; si `fetch` falla no rompe el menú. Verificar rojo.
- [ ] **Step 5: Implementar** en `command-menu.tsx`: `Command shouldFilter={false}`, estado de resultados, `AbortController` para descartar respuestas viejas; los grupos "Acciones" e "Ir a" se filtran localmente por el término. Quitar el comentario "se agrega en la Etapa 4".
- [ ] **Step 6: Verde** (`npx vitest run src/features/search src/components/layout`) + comprobar en la demo con `curl` autenticado por cookie que `/app/buscar?q=balde` devuelve hits y `q=%` devuelve `[]`. Commit `feat: buscador global de registros`.

---

### Task 2: Costos (pantalla de lectura)

**Files:**
- Create: `src/features/costs/{types.ts,queries.ts,queries.test.ts}`, `src/features/costs/components/{costs-view.tsx,costs-table.tsx,deviation-table.tsx}` (+ tests), `src/app/app/costos/page.tsx`
- Modify: `src/lib/navigation.ts` (ítem "Costos", ícono `Calculator`, grupo `operacion`, después de Compras), `src/lib/navigation.test.ts`

**Interfaces:**
- Consumes: vistas `item_costing` (materials_cost, labor_cost, overhead_cost, standard_cost) e `item_catalog` (name, sku, sale_price, type = `product`); `production_order_overview` (status = `completed`; costos planificados y reales unitarios); `costVariance` de `@/features/production/costs`.
- Produces: `type ProductCostRow = { itemId; name; sku; materials: number | null; labor: number | null; overhead: number | null; standard: number | null; price: number | null; margin: number | null }` (margen = `(price − standard) / price`, `null` si falta receta o `price` es 0); `type OrderDeviationRow = { id; code; itemName; plannedUnit: number; actualUnit: number }`; `getCosts(orgId): Promise<{ products: ProductCostRow[]; deviations: OrderDeviationRow[] }>` (productos activos ordenados por nombre; las 8 últimas órdenes completadas por fecha de cierre).

- [ ] **Step 1: Tests en rojo:** `getCosts` arma filas con margen correcto (precio 4200, estándar 1295,53 → 69,2 %); producto sin receta → `standard`/`margin` `null`; precio 0 → `margin` `null` sin dividir; devuelve a lo sumo 8 desvíos ordenados de más reciente a más antigua; filtra por `organization_id`. Componentes: la tabla muestra "—" para `null`, margen con color según signo, filas enlazadas a `/app/productos/<id>`; la tabla de desvíos usa `costVariance` ("más caro"/"más barato" con texto, no sólo color); estados vacíos ("Todavía no hay productos con receta", "Todavía no hay órdenes completadas"). `navigation.test.ts`: Costos aparece en demo y en miembro.
- [ ] **Step 2: Verificar rojo.** Run: `npx vitest run src/features/costs src/lib/navigation.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implementar** consultas, componentes y la página `costos/page.tsx` (`<Suspense>` con skeleton, encabezado "Costos" con descripción "Costo estándar de cada producto y desvío de las últimas órdenes").
- [ ] **Step 4: Verde** + comprobar en la demo (`next start`) que `/app/costos` carga con datos reales y sin esqueletos. Commit `feat: pantalla de costos`.

---

### Task 3: Empleados

**Files:**
- Create: `supabase/migrations/20261123001200_employees_update.sql`, `supabase/tests/employees.test.ts`, `src/features/employees/{types.ts,queries.ts,queries.test.ts,schemas.ts,schemas.test.ts,actions.ts,actions.test.ts}`, `src/features/employees/components/{employees-view.tsx,employees-table.tsx,employee-dialog.tsx}` (+ tests), `src/app/app/empleados/page.tsx`
- Modify: `src/lib/navigation.ts` (ítem "Empleados", ícono `Users`, grupo `operacion`), `src/lib/navigation.test.ts`

**Interfaces:**
- Consumes: tabla `employees` (first_name, last_name, position, area_id, status, hourly_cost, …) y `areas`; `createAction` con permiso `manageEmployees`; `parseTableParams`/`DataTable` como en Compras.
- Produces: `type EmployeeRow = { id; name; position: string | null; areaName: string | null; status: "active" | "on_leave" | "inactive"; hourlyCost: number | null }`; `listEmployeesTable(orgId, params)` (paginada, `PGRST103` → última página, búsqueda por nombre con `sanitizeSearch`), `listAreas(orgId)`; `employeeSchema` (`firstName`, `lastName` 1–80, `position` ≤ 80 opcional, `areaId` uuid opcional, `hourlyCost` ≥ 0 opcional, `status`); acciones `createEmployee(values)` y `updateEmployee({ id, ...values })` que verifican que el empleado y el área sean de la organización activa. La migración otorga `update (first_name, last_name, position, area_id, status, hourly_cost)` sobre `employees` a `authenticated` (sin tocar `organization_id` ni `user_id`) y mantiene `anon` sin escritura; el trigger `updated_at` ya existente sigue aplicando.

- [ ] **Step 1: Tests en rojo.** SQL (`employees.test.ts`): un admin actualiza nombre/costo/estado de un empleado propio; no puede cambiar `organization_id`; un usuario de otra fábrica no actualiza (0 filas); `anon` no puede insertar ni actualizar; `anon` lee los empleados de la demo sin `created_by`. TS: schema (nombre vacío, costo negativo, vacío → `null`), acciones (demo rechazada, sin permiso, empleado ajeno, área ajena, éxito revalida `/app/empleados`), consulta (paginación y `PGRST103`), tabla (columnas, badge de estado con texto, "—" sin costo, estado vacío), diálogo (valida, error del servidor visible, botón "No disponible en la demo" deshabilitado, doble envío).
- [ ] **Step 2: Verificar rojo.** Run: `npx vitest run src/features/employees supabase/tests/employees.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implementar** migración (con el patrón final de `revoke`/`grant`), queries, schema, acciones, componentes y página `empleados/page.tsx` (botón "Nuevo empleado" que abre el diálogo; editar desde la fila; dar de baja = estado "Inactivo", sin borrar). Sin ficha de detalle.
- [ ] **Step 4: Aplicar y verificar.** `npm run db:push`, `npm run db:types`, `npm run db:verify` (sin `✗`); en la demo `/app/empleados` carga y `?page=999` no rompe. Commit `feat: empleados con alta y edición`.

---

### Task 4: Exportar a CSV

**Files:**
- Create: `src/lib/csv.ts`, `src/lib/csv.test.ts`, `src/components/data/export-button.tsx` (+ test), `src/app/app/inventario/exportar/route.ts`, `src/app/app/costos/exportar/route.ts`, `src/app/app/produccion/exportar/route.ts`
- Modify: encabezados de Inventario, Costos y Producción (botón "Exportar CSV"), README (ruta de exportaciones)

**Interfaces:**
- Consumes: `getCosts` (Task 2), `listOrders`/vistas de producción e inventario con `organization_id`; `requireSession()`.
- Produces: `toCsv(columns: string[], rows: (string | number | null)[][]): string` — separador coma, saltos `\r\n`, comillas dobles escapadas, BOM UTF-8 al inicio, celdas de texto que empiezan con `=`, `+`, `-`, `@`, tab o CR se prefijan con `'`; los números se emiten tal cual. `ExportButton({ href, label? })` es un enlace con ícono que descarga (`download`). Cada route handler responde `text/csv; charset=utf-8` con `Content-Disposition: attachment; filename="<modulo>-<YYYY-MM-DD>.csv"` (fecha en Buenos Aires), hasta 5000 filas, sólo columnas de negocio (nunca autores).

- [ ] **Step 1: Tests en rojo** (`csv.test.ts`): coma/comilla/salto de línea se escapan (`"a ""b"", c"`); `=SUMA(1)` → `'=SUMA(1)`; `-5` como número no se prefija pero `"-5"` como texto sí; `null` → vacío; empieza con BOM; filas con distinta cantidad de columnas lanzan error. Route handlers (cliente simulado): devuelven el `Content-Type` y el nombre de archivo esperados, filtran por la organización de la sesión y no incluyen columnas de autor. `ExportButton` renderiza un enlace con `download` y texto accesible.
- [ ] **Step 2: Verificar rojo.** Run: `npx vitest run src/lib/csv.test.ts src/components/data` — Expected: FAIL.
- [ ] **Step 3: Implementar** `toCsv`, `ExportButton`, los tres route handlers y agregar el botón en los encabezados de Inventario, Costos y Producción.
- [ ] **Step 4: Verde** + descargar cada CSV de la demo con `curl` autenticado por cookie y comprobar encabezados HTTP, BOM, que las tildes se ven bien y que no hay columnas de autor. Commit `feat: exportar a CSV`.

---

### Task 5: Cierre del bloque 4C

**Files:** Modify `README.md` (estado, rutas `/app/costos`, `/app/empleados`, exportaciones, buscador), `docs/superpowers/specs/2026-11-22-etapa-4-design.md` (sólo si una decisión cambió).

- [ ] **Step 1:** actualizar README (Etapa 4 completa; los recortes como "ideas para retoques": Proveedores, Reportes con gráficos, ficha de empleado, asignar personal, carga de horas).
- [ ] **Step 2:** verificación completa: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run db:verify` (sin `✗`).
- [ ] **Step 3:** recorrido en la demo con `next start -p 3100`: buscador (producto, orden, compra), Costos, Empleados (`?page=999`), las tres exportaciones, enlaces del menú; ningún 404. Cerrar el servidor.
- [ ] **Step 4:** commit `chore: cierre del bloque 4C` y **detenerse para la revisión final y la revisión con el autor** (el merge a `main` lo decide el autor).
