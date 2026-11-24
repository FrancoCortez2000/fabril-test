# FABRIL

Sistema de gestión integral para pequeñas y medianas fábricas: producción, inventario, recetas (BOM), compras, empleados, costos y reportes.

> **Estado:** Etapa 4 completa. Hay una **demo pública sin cuenta y de solo lectura** (`/demo`) y funcionan sobre la base real el Dashboard (con la campana de alertas), Productos, Materias primas (con recetas y costo estándar), Inventario, **Compras** (confirmar, recibir, cancelar), **Producción** (nueva orden con vista previa de materiales; iniciar, registrar avance, completar, cancelar y crear compra con faltantes; costo planificado vs. real), **Costos** (costo estándar y margen por producto, planificado vs. real), **Empleados** (alta y edición), un **buscador global** (Ctrl+K), **exportación a CSV** (Inventario, Costos y Producción) y Configuración. Ideas para retoques: pantalla de Proveedores, Reportes con gráficos propios, ficha de empleado, asignar personal y cargar horas reales a la orden, consumos reales y devoluciones al completar o cancelar. Plan completo: [`docs/plan-tecnico.md`](docs/plan-tecnico.md); diseño de la etapa: [`docs/superpowers/specs/2026-11-22-etapa-4-design.md`](docs/superpowers/specs/2026-11-22-etapa-4-design.md).

## Stack

Next.js 16 (App Router, Cache Components, proxy) · TypeScript estricto · Tailwind CSS 4 · shadcn/ui (Radix) · React Hook Form + Zod · TanStack Table · Recharts · Supabase (Postgres, Auth, Storage) · Vitest + PGlite · Playwright.

## Requisitos

- Node.js 22.18 o superior (desarrollado con Node 24; los scripts `.mts` corren sin compilar).
- npm 10 o superior.
- Un proyecto de Supabase en la nube. No hace falta Docker: las pruebas de la base corren con PGlite (Postgres en WASM).

## Instalación

```bash
npm install
cp .env.example .env.local   # y completá los valores (ver abajo)
npm run dev
```

## Supabase

### 1. Variables de entorno

Completá `.env.local` (git lo ignora; nunca lo subas):

| Variable                               | Dónde se obtiene                                                | Quién la usa                                     |
| -------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Project Settings → API Keys / Data API                          | App y scripts                                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys (`sb_publishable_…`)                | Navegador y servidor. Es pública: la protege RLS |
| `SUPABASE_SECRET_KEY`                  | Project Settings → API Keys (`sb_secret_…`)                     | **Sólo servidor y scripts**                      |
| `NEXT_PUBLIC_SITE_URL`                 | `http://localhost:3000` en desarrollo; tu dominio en producción | Enlaces de los emails de Auth                    |
| `SUPABASE_PROJECT_REF`                 | La parte `abcdefghijkl` de la URL del proyecto                  | Scripts                                          |
| `SUPABASE_ACCESS_TOKEN`                | supabase.com/dashboard/account/tokens                           | Scripts (CLI y API de administración)            |
| `SUPABASE_DB_PASSWORD`                 | Project Settings → Database                                     | `db:push`                                        |

### 2. Base de datos y Auth

```bash
npm run db:push      # aplica supabase/migrations al proyecto
npm run db:types     # regenera src/types/database.ts desde el esquema
npm run auth:config  # desactiva el registro público y fija URLs (emails en español sólo con SMTP propio)
npm run db:verify    # prueba de aislamiento entre fábricas contra la nube + security advisor
```

### 3. Fábricas, usuarios y demo

No hay registro público. Las cuentas se crean así:

```bash
# Alta de una fábrica (tarea del proveedor del SaaS). Si el email no tiene cuenta,
# imprime un enlace de invitación de 24 h para compartir.
npm run fabrica:crear -- --nombre "Plásticos Sur S.R.L." --email "dueno@plasticossur.com" --admin "Nombre Apellido"

# Organización demo "Plásticos del Litoral S.A." para un usuario existente.
npm run demo:crear -- --email "dueno@plasticossur.com"
npm run demo:publica -- --email "dueno@plasticossur.com"   # marca su demo como la pública (/demo, sin cuenta, solo lectura)
```

Dentro del panel, **Configuración → Usuarios** invita a más personas con un enlace para copiar y mandar por WhatsApp o email. La demo vive en su propia organización, con la marca DEMO; nunca se mezcla con datos reales.

> **Email de Supabase:** el servicio incluido sólo entrega a direcciones del equipo del proyecto y tiene un límite bajo por hora. Para que la recuperación de contraseña llegue a clientes reales, configurá un SMTP propio en _Authentication → Emails → SMTP Settings_, por ejemplo Resend o Postmark. Las invitaciones no dependen del email: se comparten con un enlace.

### Capturas de la landing

Las imágenes de la landing salen de la demo pública. Para regenerarlas: `npm run build`, `npx next start -p 3100` en otra terminal y `npm run capturas` (necesita Chromium: `npx playwright install chromium`).

## Rutas

| Ruta                                                               | Qué hay                                                                                 |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `/`                                                                | Landing pública con calculadora de materiales y el botón «Probar la demo»               |
| `/demo`                                                            | Entra a la demo pública (sin cuenta, solo lectura) y lleva a `/app`                     |
| `/ingresar`, `/recuperar`, `/restablecer`                          | Ingreso, recuperación y elección de contraseña (también para invitaciones)              |
| `/auth/confirm`                                                    | Destino de los enlaces de email y de invitación                                         |
| `/app`                                                             | Panel: con sesión (todo, con escritura) o con la demo pública (solo lectura)            |
| `/app/productos`, `/app/materias-primas`                           | Listas y fichas (receta, costo estándar, movimientos); en la demo no se guarda nada     |
| `/app/compras`, `/app/compras/[id]`                                | Lista y ficha de compras; confirmar, recibir mercadería y cancelar                      |
| `/app/produccion`, `/app/produccion/nueva`, `/app/produccion/[id]` | Lista, nueva orden con vista previa y ficha con acciones y costos                       |
| `/app/costos`, `/app/empleados`                                    | Costos por producto y desvíos; lista de empleados con alta y edición                    |
| `/app/buscar?q=`, `/app/{inventario,costos,produccion}/exportar`   | Búsqueda global (JSON) y descargas CSV; funcionan también en la demo (solo lectura)     |
| `/app/inventario`                                                  | Existencias, entradas, salidas y ajustes; `/app/inventario/movimientos` es el historial |
| `/app/configuracion`                                               | Datos de la fábrica y usuarios (no existe en la demo)                                   |
| `/estilos`                                                         | Referencia interna del sistema de diseño                                                |

## Scripts

| Comando                       | Para qué                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `npm run dev`                 | Servidor de desarrollo                                                            |
| `npm run build` / `npm start` | Compilación y servidor de producción                                              |
| `npm run typecheck`           | Tipos de rutas de Next y `tsc`                                                    |
| `npm run lint`                | ESLint                                                                            |
| `npm test`                    | Todos los tests: unitarios, componentes y base de datos                           |
| `npm run test:db`             | Sólo las pruebas SQL (PGlite: migraciones, RLS, stock, compras, producción, demo) |
| `npm run format`              | Prettier                                                                          |
| `npm run capturas`            | Regenera `public/capturas/*.png` desde la demo (con `next start -p 3100` andando) |

## Estructura

```
src/
  app/            rutas: (marketing), (auth), auth/confirm, app/ (panel)
  components/     ui (shadcn), layout, data-table, forms, data, feedback, charts
  features/       un módulo por carpeta: schemas, actions, queries, lógica, componentes
  lib/            supabase (clientes), auth (sesión, permisos), actions, formatos es-AR, dominio
  proxy.ts        refresco de sesión y protección de /app
supabase/
  migrations/     esquema versionado: núcleo, catálogo, inventario, compras, producción, storage, demo
  tests/          pruebas SQL con PGlite (shim.sql imita los roles y esquemas de Supabase)
scripts/          db, auth:config, fabrica:crear, demo:crear, demo:publica, db:verify, capturas
docs/             plan técnico y planes de implementación
```

### Seguridad

- RLS en todas las tablas. Se lee siendo miembro activo de la fábrica y se escribe siendo administrador. Ninguna tabla depende de los permisos por defecto de Supabase.
- El stock sólo cambia por funciones transaccionales de la base. El libro de movimientos es inmutable, igual que el historial de órdenes y la actividad.
- La clave secreta sólo se usa en `src/lib/supabase/admin.ts` (`server-only`) y en `scripts/`.
- El servidor nunca toma la fábrica activa del cliente: sale de la sesión, validada contra las membresías.
- La demo pública no tiene usuario: `anon` sólo puede **leer** la fábrica marcada como pública (`organizations.is_public_demo`) y no tiene ninguna política ni función de escritura. La cookie `fabril_demo` sólo elige qué mostrar; no es una credencial.

Convenciones: código y tipos en inglés; rutas, interfaz y mensajes en español (Argentina). Formatos: fechas `DD/MM/AAAA`, moneda `$ 1.234,56`, zona horaria `America/Argentina/Buenos_Aires`.
