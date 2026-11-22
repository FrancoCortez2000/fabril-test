# FABRIL

Sistema de gestión integral para pequeñas y medianas fábricas: producción, inventario, recetas (BOM), compras, empleados, costos y reportes.

> **Estado:** Etapa 3 (base de datos y autenticación). El esquema completo vive en `supabase/migrations`, con RLS, funciones de negocio transaccionales y datos demo generados por las mismas reglas. El panel exige sesión. Las pantallas de cada módulo se construyen sobre la base real en la Etapa 4. Plan completo: [`docs/plan-tecnico.md`](docs/plan-tecnico.md).

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
```

Dentro del panel, **Configuración → Usuarios** invita a más personas con un enlace para copiar y mandar por WhatsApp o email. La demo vive en su propia organización, con la marca DEMO; nunca se mezcla con datos reales.

> **Email de Supabase:** el servicio incluido sólo entrega a direcciones del equipo del proyecto y tiene un límite bajo por hora. Para que la recuperación de contraseña llegue a clientes reales, configurá un SMTP propio en _Authentication → Emails → SMTP Settings_, por ejemplo Resend o Postmark. Las invitaciones no dependen del email: se comparten con un enlace.

## Rutas

| Ruta                                      | Qué hay                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `/`                                       | Landing pública con calculadora de materiales y formulario de demostración (guarda en la base) |
| `/ingresar`, `/recuperar`, `/restablecer` | Ingreso, recuperación y elección de contraseña (también para invitaciones)                     |
| `/auth/confirm`                           | Destino de los enlaces de email y de invitación                                                |
| `/app`                                    | Panel (exige sesión). Dashboard y productos siguen con datos de ejemplo hasta la Etapa 4       |
| `/app/configuracion`                      | Usuarios de la fábrica                                                                         |
| `/estilos`                                | Referencia interna del sistema de diseño                                                       |

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

## Estructura

```
src/
  app/            rutas: (marketing), (auth), auth/confirm, app/ (panel)
  components/     ui (shadcn), layout, data-table, forms, data, feedback, charts
  features/       un módulo por carpeta: schemas, actions, queries, lógica, componentes
  lib/            supabase (clientes), auth (sesión, permisos), actions, formatos es-AR, dominio
  proxy.ts        refresco de sesión y protección de /app
  fixtures/       datos de ejemplo del dashboard y productos (se eliminan en la Etapa 4)
supabase/
  migrations/     esquema versionado: núcleo, catálogo, inventario, compras, producción, storage, demo
  tests/          pruebas SQL con PGlite (shim.sql imita los roles y esquemas de Supabase)
scripts/          db, auth:config, fabrica:crear, demo:crear, db:verify
docs/             plan técnico y planes de implementación
```

### Seguridad

- RLS en todas las tablas. Se lee siendo miembro activo de la fábrica y se escribe siendo administrador. Ninguna tabla depende de los permisos por defecto de Supabase.
- El stock sólo cambia por funciones transaccionales de la base. El libro de movimientos es inmutable, igual que el historial de órdenes y la actividad.
- La clave secreta sólo se usa en `src/lib/supabase/admin.ts` (`server-only`) y en `scripts/`.
- El servidor nunca toma la fábrica activa del cliente: sale de la sesión, validada contra las membresías.

Convenciones: código y tipos en inglés; rutas, interfaz y mensajes en español (Argentina). Formatos: fechas `DD/MM/AAAA`, moneda `$ 1.234,56`, zona horaria `America/Argentina/Buenos_Aires`.
