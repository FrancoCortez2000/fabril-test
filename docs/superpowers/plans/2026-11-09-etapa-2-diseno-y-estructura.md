# FABRIL Etapa 2 — Diseño y estructura visual · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Proyecto Next.js funcionando con sistema de diseño, shell del panel `/app`, kit de componentes reutilizables, maquetas de dashboard/tabla/formulario con datos de ejemplo tipados, landing pública y pantallas de autenticación, listo para conectar Supabase en la Etapa 3.

**Architecture:** Next.js 16 App Router con grupos de rutas `(marketing)`, `(auth)` y `app/`. Lógica pura (formatos, cálculo de materiales, parámetros de tabla, esquemas Zod) en módulos testeados con Vitest; componentes de presentación en `components/` y `features/`. Los datos de ejemplo viven sólo en `src/fixtures/` y se eliminan en la Etapa 4.

**Tech Stack:** Next.js 16.4, React 19, TypeScript strict, Tailwind CSS 4, shadcn/ui, Lucide, Recharts, React Hook Form, Zod 4, TanStack Table, next-themes, sonner, date-fns, Vitest + Testing Library.

**Spec:** `docs/plan-tecnico.md` (§2 stack/estructura, §6 rutas, §7 diseño, §10 Etapa 2).

## Global Constraints

- Toda la UI en español (Argentina, voseo). Código, nombres de archivos de lógica y tipos en inglés; rutas en español.
- Fechas `DD/MM/AAAA`, moneda ARS `$ 1.234,56`, números con `.` de miles y `,` decimal. Zona `America/Argentina/Buenos_Aires`.
- TypeScript `strict: true`, sin `any` explícito.
- Sin gradientes decorativos, sin sombras pesadas, sin etiquetas en MAYÚSCULAS sobre títulos, sin “→” agregado a botones, sin numeración salvo en secuencias reales (“Cómo funciona”).
- Sin claves ni URLs de Supabase en esta etapa.
- Tokens de diseño (valores exactos):
  - Claro: `--background #F3F4F6`, `--surface #FFFFFF`, `--surface-2 #E9ECEF`, `--border #D9DDE2`, `--ink #1C2127`, `--muted #5B6670`, `--accent #F2A900`, `--accent-hover #DB9800`, `--accent-ink #1C2127`, `--danger #C62828`.
  - Oscuro: `--background #15191E`, `--surface #1B2026`, `--surface-2 #232931`, `--border #2F363F`, `--ink #E6E9ED`, `--muted #98A2AD`, `--accent #F2B71F`, `--accent-hover #FFC93D`, `--accent-ink #15191E`, `--danger #EF5350`.
  - Estados (punto de color + texto): planificada `#64748B`, en producción `#2563EB`, control de calidad `#7C3AED`, completada `#15803D`, cancelada `#9CA3AF`, demorada `#DC2626`; compras: borrador `#9CA3AF`, pendiente `#B7791F`, parcialmente recibida `#2563EB`, recibida `#15803D`, cerrada con faltantes `#64748B`, cancelada `#9CA3AF`.
  - Radios: `6px` controles, `10px` paneles. Fuentes: Archivo (variable `wght`+`wdth`) para todo; títulos con `font-stretch: 75%`; IBM Plex Mono sólo para SKU y códigos de documento. Cifras en tablas con `font-variant-numeric: tabular-nums`.
- Ancho de breakpoints a verificar: 360, 768, 1280 px.

## Review Focus

1. Fechas sin hora (`"2026-11-09"`) mostradas un día antes por conversión UTC → deben verse `09/11/2026` (test en Task 2).
2. Números tipeados a la argentina (`"1.234,5"`, `"0,250"`, `" 12 "`, `"abc"`) → se interpretan bien o se rechazan, nunca se convierten en `1.2345` (test en Task 2 y Task 5).
3. Tablas con nombres largos en 360 px → no generan scroll horizontal de página; se muestran como tarjetas (verificación en Task 6 y Task 12).
4. Parámetros de URL manipulados (`?page=-3&pageSize=9999&sort=foo`) → se normalizan a valores válidos (test en Task 6).
5. Navegación sólo con teclado: sidebar, menú de comandos `Ctrl+K`, diálogos → foco visible y `Esc` cierra (verificación en Task 7 y Task 12).

---

### Task 1: Scaffold del proyecto y herramientas

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.prettierrc`, `vitest.config.ts`, `vitest.setup.ts`, `components.json`, `.gitignore`, `src/app/layout.tsx`, `src/lib/utils.ts`, `src/lib/smoke.test.ts`

**Interfaces:**
- Produces: alias `@/*` → `src/*`; `cn(...classes)` en `src/lib/utils.ts`; scripts `dev`, `build`, `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `format`.

- [ ] **Step 1:** `git init` en la raíz; `.gitignore` con `node_modules`, `.next`, `.env*` excepto `.env.example`.
- [ ] **Step 2:** Generar Next.js 16 (TS, Tailwind, ESLint, App Router, `src/`, alias `@/*`, npm) en una carpeta temporal del scratchpad y mover los archivos a la raíz (el directorio ya tiene `docs/`, que `create-next-app` rechaza). Activar `strict`, `noUncheckedIndexedAccess`.
- [ ] **Step 3:** Instalar dependencias: `react-hook-form @hookform/resolvers zod @tanstack/react-table recharts next-themes sonner date-fns lucide-react` y dev `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom prettier prettier-plugin-tailwindcss`. Fijar versiones exactas (`save-exact`).
- [ ] **Step 4:** `npx shadcn@latest init` (estilo new-york, base neutral, CSS variables) y agregar: `button input label textarea select checkbox dialog alert-dialog sheet dropdown-menu popover command tooltip tabs badge separator skeleton table form sonner accordion avatar scroll-area calendar`.
- [ ] **Step 5:** Test de humo `src/lib/smoke.test.ts`: `expect(cn("a", false && "b", "c")).toBe("a c")`. Run `npm test` → PASS.
- [ ] **Step 6:** Run `npm run typecheck && npm run lint && npm run build` → sin errores.
- [ ] **Step 7:** Commit `chore: scaffold Next.js 16 con Tailwind, shadcn y Vitest`.

### Task 2: Formatos argentinos (`lib/format.ts`)

**Files:**
- Create: `src/lib/format.ts`, `src/lib/format.test.ts`

**Interfaces:**
- Produces:
  - `formatCurrency(value: number): string`
  - `formatNumber(value: number, opts?: { decimals?: number }): string`
  - `formatQuantity(value: number, unitCode: string): string`
  - `formatPercent(value: number, decimals?: number): string` (recibe 3 → `"3 %"`, es decir porcentaje ya expresado en puntos)
  - `formatDate(value: string | Date): string`
  - `formatDateTime(value: string | Date): string`
  - `formatRelative(value: string | Date, now?: Date): string`
  - `parseDecimal(input: string): number | null`
  - `TIMEZONE = "America/Argentina/Buenos_Aires"`

- [ ] **Step 1: Tests** (normalizar ` ` y ` ` a espacio en un helper del test):
  ```ts
  formatCurrency(1234567.891)      // "$ 1.234.567,89"
  formatCurrency(-50)              // "-$ 50,00"
  formatNumber(1234.5)             // "1.234,5"
  formatNumber(0.25, { decimals: 3 }) // "0,250"
  formatQuantity(257.5, "kg")      // "257,5 kg"
  formatQuantity(1000, "u")        // "1.000 u"
  formatPercent(3)                 // "3 %"
  formatDate("2026-11-09")         // "09/11/2026"   ← no debe correrse al 08
  formatDate("2026-11-09T02:30:00Z") // "08/11/2026" (23:30 en Buenos Aires)
  formatDateTime("2026-11-09T17:35:00Z") // "09/11/2026 14:35"
  formatRelative(new Date(now - 5*60e3), now) // "hace 5 minutos"
  parseDecimal("0,250")   // 0.25
  parseDecimal("1.234,5") // 1234.5
  parseDecimal(" 12 ")    // 12
  parseDecimal("12.5")    // 12.5   (punto solo + ≤2 decimales se acepta como decimal)
  parseDecimal("1.234")   // 1234   (punto + 3 dígitos = miles)
  parseDecimal("abc")     // null
  parseDecimal("")        // null
  parseDecimal("1,2,3")   // null
  ```
- [ ] **Step 2:** Run `npx vitest run src/lib/format.test.ts` → FAIL.
- [ ] **Step 3:** Implementar con `Intl.NumberFormat("es-AR")` / `Intl.DateTimeFormat("es-AR", { timeZone: TIMEZONE })`. Fechas `YYYY-MM-DD` sin hora se formatean partiendo el string, sin `new Date()`. `formatRelative` con `date-fns/formatDistanceStrict` + locale `es`. Si `Intl` devuelve `"$ -50,00"` ajustar para que el signo quede adelante.
- [ ] **Step 4:** Run tests → PASS.
- [ ] **Step 5:** Commit `feat: formatos de moneda, números y fechas para Argentina`.

### Task 3: Tokens de diseño, tipografía y tema

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`
- Create: `src/components/theme-provider.tsx`, `src/components/layout/theme-toggle.tsx`, `src/app/(marketing)/estilos/page.tsx` (página interna de referencia del sistema; `robots: noindex`)

**Interfaces:**
- Produces: utilidades Tailwind `bg-background bg-surface bg-surface-2 border-border text-ink text-muted bg-accent text-accent-ink text-danger`, `font-sans` (Archivo), `font-mono` (IBM Plex Mono), clase `.font-display` (Archivo `font-stretch: 75%`, peso 600, `letter-spacing: -0.01em`), `.tabular` (`tabular-nums`); variables shadcn (`--primary` = accent, `--ring` = accent) mapeadas a los tokens; `<ThemeToggle />`.

- [ ] **Step 1:** Cargar fuentes con `next/font/google`: `Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo" })`, `IBM_Plex_Mono({ weight: ["400","500"], variable: "--font-plex-mono" })`. `<html lang="es-AR">`.
- [ ] **Step 2:** Definir tokens de Global Constraints en `:root` y `.dark` y mapearlos en `@theme inline`. Escala tipográfica: 12/13/14 (base UI)/16/20/24/32/48/64 px. Foco visible: `outline 2px var(--accent)` offset 2px.
- [ ] **Step 3:** `ThemeProvider` (next-themes, `attribute="class"`, default `system`) y `ThemeToggle` (claro/oscuro/sistema en dropdown).
- [ ] **Step 4:** Página `/estilos` con muestras: colores, escala tipográfica, botones (primario ámbar con texto grafito, secundario, fantasma, destructivo), inputs, badges de estado.
- [ ] **Step 5:** Verificar contraste: texto `--accent-ink` sobre `--accent` y `--muted` sobre `--surface` ≥ 4.5:1 en ambos temas (calcular y anotar en la página `/estilos`).
- [ ] **Step 6:** Run `npm run build` → OK. Commit `feat: sistema de diseño (tokens, tipografía, tema claro/oscuro)`.

### Task 4: Estados de dominio y cálculo de materiales

**Files:**
- Create: `src/lib/domain/status.ts`, `src/lib/domain/status.test.ts`, `src/features/production/logic.ts`, `src/features/production/logic.test.ts`, `src/components/data/status-badge.tsx`

**Interfaces:**
- Produces:
  - `type ProductionStatus = "planned" | "in_progress" | "quality_check" | "completed" | "cancelled"`
  - `type PurchaseStatus = "draft" | "pending" | "partially_received" | "received" | "closed" | "cancelled"`
  - `PRODUCTION_STATUS: Record<ProductionStatus, { label: string; color: string }>` (labels: Planificada, En producción, Control de calidad, Completada, Cancelada)
  - `PURCHASE_STATUS: Record<PurchaseStatus, { label: string; color: string }>` (Borrador, Pendiente, Parcialmente recibida, Recibida, Cerrada con faltantes, Cancelada)
  - `isProductionOrderDelayed(o: { status: ProductionStatus; plannedEndDate: string }, today: string): boolean`
  - `type BomLineInput = { itemId: string; name: string; unitCode: string; quantity: number; wastePct: number | null }`
  - `type MaterialRequirement = { itemId: string; name: string; unitCode: string; required: number; available: number; shortage: number }`
  - `calculateMaterialRequirements(args: { plannedQty: number; outputQty: number; defaultWastePct: number; lines: BomLineInput[]; stock: Record<string, number> }): MaterialRequirement[]`
  - `<StatusBadge kind="production" | "purchase" status=... delayed?: boolean />` (punto + texto; si `delayed`, agrega marca “Demorada” en rojo)

- [ ] **Step 1: Tests**
  ```ts
  // 1.000 bidones, polietileno 0,250 kg, desperdicio receta 3 %
  calculateMaterialRequirements({ plannedQty: 1000, outputQty: 1, defaultWastePct: 3,
    lines: [{ itemId:"pe", name:"Polietileno", unitCode:"kg", quantity:0.25, wastePct:null },
            { itemId:"et", name:"Etiqueta", unitCode:"u", quantity:1, wastePct:0 }],
    stock: { pe: 200, et: 5000 } })
  // → pe: required 257.5, available 200, shortage 57.5 ; et: required 1000, shortage 0
  // outputQty 10 con quantity 2,5 y 0 % → 1000 unidades requieren 250
  // redondeo a 3 decimales: 3 × 0,3333 kg × 1,03 → 1.030 (no 1.0299…)
  isProductionOrderDelayed({status:"in_progress", plannedEndDate:"2026-11-08"}, "2026-11-09") // true
  isProductionOrderDelayed({status:"completed",  plannedEndDate:"2026-11-08"}, "2026-11-09") // false
  isProductionOrderDelayed({status:"planned",    plannedEndDate:"2026-11-09"}, "2026-11-09") // false
  PRODUCTION_STATUS.quality_check.label // "Control de calidad"
  ```
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementar. Fórmula: `required = round3(plannedQty × quantity / outputQty × (1 + (wastePct ?? defaultWastePct)/100))`; `shortage = max(0, required − available)`; `round3` con `Math.round(x * 1000) / 1000` aplicado sobre `x + Number.EPSILON`.
- [ ] **Step 4:** Run → PASS. Commit `feat: estados de dominio y cálculo de requerimientos de materiales`.

### Task 5: Kit de componentes de datos, feedback y formularios

**Files:**
- Create: `src/components/data/{stat-card,progress-bar,timeline,page-header}.tsx`, `src/components/feedback/{empty-state,confirm-dialog,error-state}.tsx`, `src/components/forms/{form-field,number-input,money-input,date-input,image-input}.tsx`, `src/components/forms/image-validation.ts`, `src/components/forms/number-input.test.tsx`, `src/components/forms/image-validation.test.ts`

**Interfaces:**
- Consumes: `parseDecimal`, `formatNumber`, `formatCurrency`, `formatDate` (Task 2).
- Produces:
  - `<PageHeader title description? actions? breadcrumbs?: {label; href?}[] />`
  - `<StatCard label value hint? delta?: { value: number; direction: "up"|"down"; positiveIsGood: boolean } icon? href? />`
  - `<ProgressBar value={0..100} tone?: "default"|"success"|"danger" label? />`
  - `<Timeline items: { id; title; description?; at: string; actor?: string }[] />`
  - `<EmptyState icon title description action?: ReactNode />`
  - `<ConfirmDialog trigger title description confirmLabel destructive? onConfirm: () => Promise<void> | void />` (botón con estado de carga, se cierra al terminar)
  - `<ErrorState title? description onRetry? />`
  - `<FormField>`: wrapper de shadcn `FormField` con label, descripción y error
  - `<NumberInput value: number | null onChange(n: number | null) decimals? unit? />` — muestra formato es-AR al perder foco, acepta coma decimal, `inputMode="decimal"`
  - `<MoneyInput />` (NumberInput con prefijo `$` y 2 decimales), `<DateInput value: string | null onChange />` (popover con calendario, muestra `DD/MM/AAAA`, valor `YYYY-MM-DD`, locale `es`)
  - `validateImageFile(file: { type: string; size: number }): { ok: true } | { ok: false; error: string }` (acepta jpeg/png/webp, máx. 2 MB; errores “Formato no admitido. Usá JPG, PNG o WebP.” / “La imagen supera los 2 MB.”)
  - `<ImageInput value?: string onChange(file: File | null) />` (vista previa local + validación; la subida a Storage llega en la Etapa 3)

- [ ] **Step 1: Tests:** NumberInput — tipear `"0,250"` y blur → `onChange(0.25)` y el input muestra `"0,25"` (o `"0,250"` con `decimals={3}`); tipear `"abc"` → `onChange(null)` y `aria-invalid="true"`. `validateImageFile({type:"image/gif", size:1})` → error de formato; `{type:"image/png", size: 3_000_000}` → error de tamaño; `{type:"image/webp", size: 500_000}` → ok.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementar componentes. **Step 4:** Run → PASS.
- [ ] **Step 5:** Agregar todas las piezas a `/estilos` para revisión. Commit `feat: kit de componentes (datos, feedback, formularios)`.

### Task 6: DataTable con estado en la URL

**Files:**
- Create: `src/components/data-table/{data-table,data-table-toolbar,data-table-pagination,data-table-filter}.tsx`, `src/components/data-table/params.ts`, `src/components/data-table/params.test.ts`

**Interfaces:**
- Produces:
  - `type TableParams = { page: number; pageSize: 10|25|50; sort: { id: string; desc: boolean } | null; q: string; filters: Record<string, string[]> }`
  - `parseTableParams(sp: Record<string, string | string[] | undefined>, opts: { sortable: string[]; filterable: string[]; defaultSort?: TableParams["sort"] }): TableParams`
  - `serializeTableParams(p: Partial<TableParams>): URLSearchParams`
  - `paginate<T>(rows: T[], p: TableParams): { rows: T[]; total: number }` (sólo para fixtures; en Etapa 4 la paginación la hace la consulta)
  - `<DataTable<T> columns: ColumnDef<T>[] rows: T[] total: number params: TableParams searchPlaceholder? filters?: { id; label; options: {value; label}[] }[] mobileCard: (row: T) => ReactNode emptyState: ReactNode onRowHref?: (row: T) => string />`
- Comportamiento: búsqueda con debounce 300 ms que actualiza `?q=` y vuelve a `page=1`; orden al clickear encabezado; filtros multiselección en popover; paginación “Mostrando 1–25 de 132”; en `< md` renderiza `mobileCard` en lista en lugar de la tabla.

- [ ] **Step 1: Tests:** `parseTableParams({ page:"-3", pageSize:"9999", sort:"foo.desc", q:"  bidon ", estado:"planned,completed" }, { sortable:["name"], filterable:["estado"] })` → `{ page:1, pageSize:25, sort:null, q:"bidon", filters:{ estado:["planned","completed"] } }`; `sort:"name.desc"` → `{ id:"name", desc:true }`; `page:"abc"` → 1; `serializeTableParams` ida y vuelta conserva valores; `paginate` página 2 de 30 filas con pageSize 25 → 5 filas, total 30.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementar. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: DataTable con búsqueda, filtros, orden y paginación en la URL`.

### Task 7: Shell del panel (`/app`)

**Files:**
- Create: `src/lib/navigation.ts`, `src/lib/navigation.test.ts`, `src/components/layout/{app-sidebar,mobile-nav,topbar,command-menu,notifications-menu,user-menu,org-switcher,logo}.tsx`, `src/app/app/layout.tsx`, `src/app/app/{materias-primas,inventario,produccion,compras,proveedores,empleados,costos,reportes,configuracion}/page.tsx`
- Create: `src/fixtures/session.ts`

**Interfaces:**
- Produces:
  - `type NavItem = { label: string; href: string; icon: LucideIcon; group: "operacion" | "gestion" | "analisis" | "sistema" }`
  - `NAV_ITEMS: NavItem[]` en este orden: Inicio `/app`; Operación: Producción, Inventario, Productos, Materias primas, Compras; Gestión: Proveedores, Empleados; Análisis: Costos, Reportes; Sistema: Configuración. Grupos con títulos en tipografía normal (no mayúsculas).
  - `isNavItemActive(pathname: string, href: string): boolean` (`/app` sólo activo exacto; el resto por prefijo)
  - `FIXTURE_SESSION = { user: { name: "Laura Benítez", email: "laura@plasticoslitoral.com.ar" }, organizations: [{ id, name: "Plásticos del Litoral S.A.", isDemo: true }] }`
- Sidebar: 248 px, colapsable a 64 px (sólo íconos con tooltip, preferencia en `localStorage`), ítem activo con barra vertical ámbar de 3 px a la izquierda; abajo, selector de organización con badge “Demo”. En `< lg` se reemplaza por `Sheet` desde el botón de menú del topbar.
- Topbar: botón de búsqueda (“Buscar… Ctrl K”) que abre `CommandMenu` (navega a los módulos y acciones rápidas; la búsqueda de registros se agrega en la Etapa 4), campana con popover (estado vacío “Sin alertas por ahora”), `UserMenu` (nombre, email, tema, “Cerrar sesión” deshabilitado con tooltip “Disponible al conectar la autenticación”).
- Páginas de módulos aún no construidos: `PageHeader` + `EmptyState` “Este módulo se construye en la Etapa 4”.

- [ ] **Step 1: Tests:** `NAV_ITEMS` hrefs únicos y todos empiezan con `/app`; `isNavItemActive("/app/produccion/123", "/app/produccion")` true; `isNavItemActive("/app/produccion", "/app")` false; `isNavItemActive("/app", "/app")` true.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementar. **Step 4:** Run → PASS.
- [ ] **Step 5:** Verificar a mano: `Ctrl+K` abre/`Esc` cierra; Tab recorre sidebar con foco visible; en 360 px el menú abre como drawer.
- [ ] **Step 6:** Commit `feat: shell del panel con sidebar, topbar y menú de comandos`.

### Task 8: Maqueta del dashboard

**Files:**
- Create: `src/fixtures/dashboard.ts`, `src/app/app/page.tsx`, `src/features/dashboard/components/{kpi-row,alerts-panel,production-chart,inventory-flow-chart,recent-activity,quick-actions}.tsx`, `src/components/charts/chart-theme.ts`

**Interfaces:**
- Consumes: StatCard, StatusBadge, Timeline, formatos.
- Produces: tipos que la Etapa 4 llenará con datos reales:
  - `type DashboardKpis = { products: number; rawMaterials: number; inventoryValue: number; activeOrders: number; unitsThisMonth: number; unitsLastMonth: number }`
  - `type MonthlyProduction = { month: string /* YYYY-MM */; units: number }[]` (12 meses)
  - `type InventoryFlow = { month: string; inValue: number; outValue: number }[]`
  - `type DashboardAlert = { kind: "low_stock" | "out_of_stock" | "delayed_order" | "late_purchase"; title: string; detail: string; href: string }`
  - `type ActivityEntry = { id: string; summary: string; actor: string; at: string; href?: string }`
- Layout (desktop): fila de 5 KPIs; debajo, izquierda 2/3 gráfico de producción mensual (barras, valor del mes actual resaltado en ámbar, resto en `--muted`), derecha 1/3 panel de alertas; tercera fila: flujo de inventario (dos áreas: entradas/salidas valorizadas, eje con `$` abreviado “$ 1,2 M”) + actividad reciente. Acciones rápidas en el `PageHeader`: “Nueva orden de producción” (primario), “Registrar compra”, “Nuevo producto”.
- Gráficos: seguir el skill `dataviz` (tooltips con formato es-AR, sin grilla vertical, ejes discretos, colores desde tokens para ambos temas).

- [ ] **Step 1:** Fixtures coherentes con la fábrica de plásticos (meses `2025-12`…`2026-11`).
- [ ] **Step 2:** Implementar componentes y página. **Step 3:** Revisar en 360/768/1280 px y en ambos temas.
- [ ] **Step 4:** Run `npm run build` → OK. Commit `feat: maqueta del dashboard con datos de ejemplo`.

### Task 9: Maqueta de tabla y formulario (Productos)

**Files:**
- Create: `src/fixtures/products.ts`, `src/features/products/schemas.ts`, `src/features/products/schemas.test.ts`, `src/features/products/components/{products-table,product-form-dialog}.tsx`, `src/app/app/productos/page.tsx`

**Interfaces:**
- Consumes: DataTable, params, NumberInput, MoneyInput, ImageInput, StatusBadge, EmptyState.
- Produces:
  - `productSchema` (Zod) con: `name` (2–120, “Ingresá un nombre de al menos 2 caracteres”), `sku` (1–40, `^[A-Z0-9-]+$` tras `toUpperCase`, “Usá letras, números y guiones”), `description` opcional ≤500, `categoryId` uuid opcional, `unitCode` en `["u","kg","g","l","ml","m","m2"]`, `minStock` ≥0, `salePrice` ≥0 nullable, `manualCost` ≥0 nullable, `status` `active|inactive`.
  - `type ProductFormValues = z.infer<typeof productSchema>`
- Tabla: columnas imagen+nombre (SKU en mono debajo), categoría, stock actual (tabular, con indicador “Bajo”/“Sin stock”), mínimo, costo estimado, precio, estado; filtros categoría y nivel de stock; tarjeta móvil con nombre, SKU, stock y estado.
- Formulario en diálogo: al enviar, valida; como todavía no hay base, muestra toast “Vista previa: el guardado se habilita al conectar la base de datos (Etapa 3)” y cierra. Etiqueta visible “Datos de ejemplo” en el encabezado de la página.

- [ ] **Step 1: Tests:** `sku: " bd-5l "` → `"BD-5L"` válido; `sku: "BD 5L"` inválido con el mensaje; `minStock: -1` inválido; `name: "A"` inválido; producto completo válido.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementar. **Step 4:** Run → PASS.
- [ ] **Step 5:** Verificar filtros/búsqueda/paginación con la URL y la vista de tarjetas en 360 px. Commit `feat: maqueta de productos (tabla y formulario)`.

### Task 10: Landing pública

**Files:**
- Create: `src/app/(marketing)/layout.tsx`, `src/app/(marketing)/page.tsx`, `src/features/marketing/components/{site-header,hero,bom-calculator,problems,modules-showcase,how-it-works,faq,demo-request-form,site-footer,screenshot-frame}.tsx`, `src/features/marketing/schemas.ts`, `src/features/marketing/schemas.test.ts`, `src/features/marketing/content.ts`

**Interfaces:**
- Consumes: `calculateMaterialRequirements`, `formatQuantity`, `NumberInput`.
- Produces: `demoRequestSchema` (Zod): `name` 2–80, `company` 2–120, `email` válido, `phone` opcional 6–30, `industry` opcional ≤80, `message` opcional ≤1000, `website` (campo trampa) debe estar vacío.
- Estructura:
  - Header: logo, anclas (Funcionalidades, Cómo funciona, Preguntas), botón “Ingresar” (`/ingresar`), botón primario “Solicitar demostración” (ancla al formulario).
  - Hero: alineado a la izquierda. Título en `.font-display` 48–64 px: “Sabé qué fabricar, con qué material y a qué costo.” Bajada: “FABRIL ordena la producción, el stock y las compras de tu fábrica en un solo lugar.” A la derecha, `BomCalculator`: producto “Bidón 5 L”, campo cantidad (por defecto 1.000), receta fija de ejemplo (Polietileno AD 0,250 kg, Masterbatch azul 0,005 kg, Etiqueta 1 u, desperdicio 3 %) con stock de ejemplo; la tabla de requeridos/disponible/faltante se recalcula en vivo y muestra el aviso “Faltan 57,5 kg de Polietileno AD” cuando corresponde.
  - Problemas (3 bloques en prosa, sin tarjetas idénticas): planillas que no cierran, materia prima que falta en el peor momento, costos que nadie sabe.
  - Funcionalidades: Producción, Inventario, Recetas, Compras, Costos y reportes; cada una con texto breve y `ScreenshotFrame` (marco con marcador “Captura real en la Etapa 5”).
  - Cómo funciona (secuencia real, numerada): Cargás productos y recetas → Planificás órdenes y comprás lo que falta → Producís y FABRIL actualiza stock y costos.
  - Preguntas frecuentes (accordion, 6 preguntas: datos y seguridad, si sirve para otros rubros, cuánto tarda la puesta en marcha, si funciona en el celular, cómo se cargan datos existentes, si hay que instalar algo).
  - Formulario “Solicitar demostración”: valida con `demoRequestSchema`; el envío real se conecta en la Etapa 3 (por ahora muestra el aviso “El envío se habilita al conectar la base de datos”).
  - Footer: logo, enlaces de secciones, “Ingresar”, © 2026 FABRIL.
- Metadata: title “FABRIL — Gestión de producción para pequeñas fábricas”, description, `og` básicos.

- [ ] **Step 1: Tests:** `demoRequestSchema` rechaza email inválido y `website` no vacío; acepta un envío mínimo (nombre, empresa, email). Test de `BomCalculator`: escribir `2000` → muestra `"515 kg"` para Polietileno AD.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementar. **Step 4:** Run → PASS.
- [ ] **Step 5:** Revisar 360/768/1280 px, ambos temas, `prefers-reduced-motion`. Commit `feat: landing pública con calculadora de materiales`.

### Task 11: Pantallas de autenticación

**Files:**
- Create: `src/app/(auth)/layout.tsx`, `src/app/(auth)/{ingresar,recuperar,restablecer}/page.tsx`, `src/features/auth/schemas.ts`, `src/features/auth/schemas.test.ts`, `src/features/auth/components/{login-form,recover-form,reset-form}.tsx`

**Interfaces:**
- Produces: `loginSchema` (`email`, `password` ≥1 “Ingresá tu contraseña”), `recoverSchema` (`email`), `resetPasswordSchema` (`password` ≥8 con al menos una letra y un número, `confirm` igual: “Las contraseñas no coinciden”).
- Layout: panel centrado 400 px sobre `--background`, logo arriba, enlace “Volver al sitio”. `/ingresar`: email, contraseña (mostrar/ocultar), “¿Olvidaste tu contraseña?”. Sin enlace de registro; texto “¿No tenés cuenta? Solicitá una demostración” con enlace a la landing. Envío conectado en la Etapa 3 (por ahora valida y muestra aviso).

- [ ] **Step 1: Tests** de los tres esquemas (contraseña `"abcdefgh"` inválida, `"abcdefg1"` válida, confirm distinto inválido).
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementar. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: pantallas de ingreso y recuperación de contraseña`.

### Task 12: Verificación de la etapa

**Files:**
- Create: `README.md` (mínimo: qué es, cómo instalar y correr en local, scripts; se completa en la Etapa 5)

- [ ] **Step 1:** Run `npm run typecheck && npm run lint && npm test && npm run build` → todo verde.
- [ ] **Step 2:** `npm run dev` y recorrer `/`, `/ingresar`, `/recuperar`, `/restablecer`, `/app`, `/app/productos`, `/app/produccion`, `/estilos` en 360, 768 y 1280 px, claro y oscuro: sin scroll horizontal, sin errores en consola, foco visible, `Esc` cierra diálogos, Review Focus 1–5 comprobados. Tomar capturas para la revisión.
- [ ] **Step 3:** Commit `docs: README inicial` y presentar capturas para la revisión visual.
