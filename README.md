# FABRIL

Sistema de gestión integral para pequeñas y medianas fábricas: producción, inventario, recetas (BOM), compras, empleados, costos y reportes.

> **Estado:** Etapa 2 completa (sistema de diseño, estructura del panel, landing y pantallas de autenticación con datos de ejemplo). La base de datos y la autenticación con Supabase llegan en la Etapa 3. El plan completo está en [`docs/plan-tecnico.md`](docs/plan-tecnico.md).

## Stack

Next.js 16 (App Router, Cache Components) · TypeScript estricto · Tailwind CSS 4 · shadcn/ui (Radix) · React Hook Form + Zod · TanStack Table · Recharts · Vitest · Playwright.

## Requisitos

- Node.js 22 o superior (desarrollado con Node 24).
- npm 10 o superior.

## Instalación y uso local

```bash
npm install
npm run dev
```

Abrí <http://localhost:3000>:

| Ruta                                      | Qué hay                                                  |
| ----------------------------------------- | -------------------------------------------------------- |
| `/`                                       | Landing pública con la calculadora de materiales         |
| `/ingresar`, `/recuperar`, `/restablecer` | Pantallas de autenticación (se conectan en la Etapa 3)   |
| `/app`                                    | Panel de administración (dashboard con datos de ejemplo) |
| `/app/productos`                          | Tabla y formulario de productos (datos de ejemplo)       |
| `/estilos`                                | Referencia interna del sistema de diseño                 |

## Scripts

| Comando                       | Para qué                                        |
| ----------------------------- | ----------------------------------------------- |
| `npm run dev`                 | Servidor de desarrollo                          |
| `npm run build` / `npm start` | Compilación y servidor de producción            |
| `npm run typecheck`           | Genera los tipos de rutas de Next y corre `tsc` |
| `npm run lint`                | ESLint                                          |
| `npm test`                    | Tests unitarios y de componentes (Vitest)       |
| `npm run format`              | Prettier                                        |

## Estructura

```
src/
  app/            rutas: (marketing), (auth), app/ (panel)
  components/     ui (shadcn), layout, data-table, forms, data, feedback, charts
  features/       un módulo por carpeta: schemas, lógica, componentes
  lib/            formatos es-AR, dominio (estados, stock), navegación
  fixtures/       datos de ejemplo de la Etapa 2 (se eliminan en la Etapa 4)
docs/             plan técnico y planes de implementación
```

Convenciones: código y tipos en inglés; rutas, interfaz y mensajes en español (Argentina). Formatos: fechas `DD/MM/AAAA`, moneda `$ 1.234,56`, zona horaria `America/Argentina/Buenos_Aires`.

La configuración de Supabase, las variables de entorno (`.env.example`) y el despliegue en Vercel se documentan en las etapas 3 y 5.
