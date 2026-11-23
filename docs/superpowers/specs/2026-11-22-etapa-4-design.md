# FABRIL — Etapa 4: funcionalidades esenciales y demo pública (diseño)

Fecha: 22/11/2026 · Reemplaza el alcance de la Etapa 4 de `docs/plan-tecnico.md` §10.

## 1. Intención

FABRIL es un **proyecto personal para el portfolio** del autor (no un SaaS con clientes). El objetivo de la
etapa es que alguien que llega desde el portfolio:

1. entre sin crear cuenta,
2. recorra la app en pocos minutos,
3. entienda qué problema resuelve —"sé qué tengo, qué me falta, qué fabriqué y cuánto me costó"— y
4. se lleve la impresión de un sistema real y sólido.

Por eso se recorta el plan original (10 módulos completos) a lo **básico y esencial**, y se agrega una
**demo pública de solo lectura**. Después de esta etapa se prueba y se hacen retoques.

## 2. Objetivos, no-objetivos, anti-objetivos

**Objetivos**
- Botón **"Probar la demo"** en la landing: lleva a `/demo`, una fábrica demo compartida, sin usuario ni contraseña.
- El visitante **ve todo y abre todo** (fichas, formularios, vista previa de materiales), pero **no guarda nada**:
  la base lo rechaza y la interfaz lo explica.
- Cinco áreas funcionando sobre datos reales: Dashboard, Productos y materias primas, Inventario, Compras y
  Producción (con recetas y costos dentro de las fichas).
- El dueño (administrador) usa todo con escritura en su fábrica real y en la demo.

**No-objetivos (se sacan de esta etapa y del menú)**
- Módulo de Reportes y exportación CSV.
- Pantallas propias de Proveedores, Empleados, Categorías, Áreas y Costos.
- Importación desde Excel, guía de primeros pasos, SMTP propio.
- Demo interactiva o por visitante (opciones B/C, descartadas; se pueden retomar como retoque).

**Anti-objetivos**
- Que un visitante pueda modificar la demo (por la API, no sólo por la interfaz).
- Botones que no hacen nada sin explicar por qué.
- Ítems de menú que llevan a carteles de "próximamente".
- Una demo que se vea rota o vacía por el paso del tiempo (se acepta que los datos envejezcan, no que falle).
- Stock que no coincide con sus movimientos (sigue vigente el principio del libro contable).

## 3. Restricciones (vigentes desde la Etapa 1)

- Lógica crítica en la base (RPC transaccionales); control de acceso en interfaz **y** backend (RLS + `require_role`).
- Sin claves privadas en el frontend; la clave secreta sólo en el servidor.
- Datos demo claramente separados de los reales (`organizations.is_demo`, marca DEMO).
- No modificar migraciones ya aplicadas en la nube: los cambios de esquema van en migraciones nuevas.
- Next 16 (`cacheComponents`, `proxy.ts`), stack y kit de componentes de las Etapas 2 y 3.
- UI en español con formato argentino. Supabase plan gratuito (sin plantillas de email propias).

## 4. Enfoques considerados para la demo pública

| Enfoque | Qué es | Contra |
|---|---|---|
| **A. Solo lectura compartida** ✅ elegido | Todos entran a la misma fábrica demo, sin cuenta, y la base sólo les deja leer | El visitante no ve el sistema "moverse" |
| B. Compartida editable, se restablece cada noche | Todos pueden tocar todo | Cada uno ve lo que rompieron los demás |
| C. Una fábrica demo propia por visitante, se borra a las 24 h | Máximo impacto, aislamiento en vivo | Más trabajo: alta automática, limpieza, límites |

El autor eligió **A** por simplicidad, con la idea de probarla y retocarla después. Mitigación propuesta
(decisión de diseño): el visitante **puede abrir formularios y ver cálculos en vivo** (por ejemplo, la vista
previa de materiales de una orden nueva); sólo el botón de guardar queda bloqueado con una explicación.
Así se ven las funcionalidades sin escribir datos.

## 5. Diseño

### 5.1 Demo pública sin usuario ni contraseña

Decisión del autor (23/11/2026): la demo es para que cualquiera la recorra, así que **no hay cuenta, usuario ni
contraseña**. Se descartan el rol `viewer` y el usuario visitante.

- **Acceso anónimo de solo lectura, aplicado en la base (RLS).** Migración nueva con una marca persistente de
  "organización demo pública" (columna o tabla de configuración; como máximo una) y políticas `select` para el
  rol `anon` limitadas a **esa organización**, en cada tabla y vista que la demo muestra. Las funciones de
  lectura que necesite (agregados del dashboard, existencias) se otorgan a `anon` con el mismo límite. **No se
  crea ninguna política de escritura para `anon` y no se le otorga ninguna RPC de escritura**: aunque alguien
  use la clave pública directamente, sólo puede leer los datos de mentira de la demo. Tests de base: `anon`
  lee la demo, no lee ninguna otra organización y no puede insertar, actualizar ni borrar nada.
- **Datos públicos a propósito**: la demo sólo contiene datos ficticios; ninguna fábrica real es legible por
  `anon`. La clave secreta no interviene en la demo y sigue sólo en el servidor.
- **Rutas `/demo/...`** (sin sesión): las mismas pantallas de `/app`, alimentadas con la organización demo
  pública en lugar de la membresía del usuario. Las pantallas reciben el contexto (organización, rol,
  modo demo) desde un único lugar, de modo que no se duplica la interfaz. El rol del modo demo es sin permisos
  de escritura (`can()` devuelve `false`).
- **Entrada**: botón "Probar la demo" (landing: encabezado, hero y cierre; también en `/ingresar`) que lleva
  a `/demo`. Sin formularios, sin acciones del servidor, sin límite por IP (no se crea nada).
- **La demo pública es la demo que ya existe en la nube** ("Plásticos del Litoral S.A."): se marca como
  pública con el script `npm run demo:publica -- --email <dueño>` (idempotente; la crea si no existe).
  `demo:crear` se mantiene para demos privadas. El dueño sigue entrando a su demo como admin desde `/app`.
- **Si la demo pública no existe** (script no corrido), el botón no se muestra o muestra un error claro.
- El encabezado del modo demo muestra "Volver al sitio" en lugar del menú de usuario; no hay cierre de sesión.
  de "Cerrar sesión", y no ofrece cambio de contraseña.

### 5.2 Datos de la demo (fijos)

Los datos de la demo se cargan una vez con `demo:crear` / `demo:publica` y **quedan fijos**. No hay
regeneración diaria (decisión del autor: no importa que los datos envejezcan; se refrescan a mano corriendo
el script si hace falta, o se agrega un cron como retoque futuro). Consecuencia: el Dashboard y los
movimientos "recientes" se irán viendo más viejos con el tiempo; las pantallas no deben romperse ni verse
vacías por eso (rangos de fecha tolerantes).

### 5.3 Experiencia del visitante (interfaz)

- **Franja fija** arriba del panel: "Estás viendo una demo de solo lectura de FABRIL · Los cambios no se
  guardan" + enlace "Volver al sitio".
- En modo demo `can()` devuelve `false` para todos los permisos de escritura (contexto de demo sin rol). Botones de acción: **visibles**, abren su diálogo o
  página; el botón final de guardar/confirmar queda deshabilitado con el texto "No disponible en la demo".
  Acciones directas sin formulario (p. ej. "Iniciar orden") quedan deshabilitadas con tooltip.
- Las acciones del servidor siguen validando permisos (`createAction` con `permission`) y la base rechaza igual.
- **Corregir** (menor diferido de la Etapa 3): `getSession` hoy cae en rol `admin` por defecto si falla la
  consulta de membresías; el rol desconocido debe tratarse como sin permisos.
- En modo demo no hay selector de fábrica ni menú de usuario: sólo la demo y "Volver al sitio".

### 5.4 Navegación final

Menú: **Inicio · Producción · Inventario · Productos · Materias primas · Compras · Configuración**
(Configuración no existe en modo demo). Se eliminan Proveedores, Empleados, Costos y Reportes del menú y sus
páginas placeholder. El buscador global y la campana de alertas se mantienen (ver 5.10).

### 5.5 Dashboard (`/app`)

Reemplaza los fixtures por datos reales de la organización activa (los componentes de la Etapa 2 se reutilizan):
- KPIs: productos activos, materias primas activas, valor del inventario (Σ stock × costo promedio), órdenes
  activas, unidades fabricadas en el mes con variación vs mes anterior.
- Alertas: stock bajo / agotado (bajo mínimo), órdenes demoradas.
- Gráfico de producción mensual (12 meses) y de movimientos valorizados (entradas vs salidas).
- Actividad reciente (`activity_log`), accesos rápidos (nueva orden, nueva compra, nuevo producto).
- Consultas agregadas preferentemente en vistas o funciones SQL `security invoker` (no traer miles de filas al servidor).

### 5.6 Productos y materias primas

- **Listas** (`/app/productos`, `/app/materias-primas`) con el DataTable existente: búsqueda por SKU/nombre,
  filtro por categoría y estado de stock, orden, paginación por URL. Columnas clave: SKU, nombre, categoría,
  stock (con indicador bajo mínimo), costo (promedio para MP; estándar para producto), precio (producto).
- **Alta / edición** en diálogo (patrón existente `product-form-dialog`): SKU, nombre, descripción, categoría
  (desplegable con las existentes), unidad, mínimo, precio de venta (producto), minutos estándar e
  indirectos (producto), proveedor preferido (MP, desplegable). **No se muestra `manual_cost`**: la base no lo
  usa para costear, y mostrarlo haría que la ficha y el costo planificado de las órdenes no coincidan. El
  "costo estándar" de la interfaz usa exactamente la misma fórmula que la base para el costo planificado
  (promedio de materias primas + minutos × costo hora + indirectos). Imagen: opcional, se
  mantiene si el kit ya la soporta; si complica, queda para retoques.
- **Archivar / reactivar** (usa `archived_at`) con confirmación. No hay borrado.
- **No se puede cambiar la unidad** de un ítem con movimientos (menor diferido de la Etapa 3): validarlo en la
  base (trigger o grant) y deshabilitar el campo en la interfaz.
- **Ficha** (`/app/productos/[id]`, `/app/materias-primas/[id]`):
  - Resumen: stock, disponible (stock − comprometido), costo promedio / último costo, mínimo, precio, margen.
  - Movimientos del ítem (kardex con saldo).
  - Producto: **Receta** (ver 5.8) y **Costo estándar desglosado** (materiales + mano de obra + indirectos)
    y **Órdenes** de producción del producto.
  - Materia prima: **Usado en** (recetas que la usan) y **Compras** recientes.

### 5.7 Inventario

- **Existencias** (`/app/inventario`): todos los ítems con stock, comprometido, disponible, valor; filtros por
  tipo, categoría, nivel (agotado / bajo mínimo / ok).
- **Acciones** (diálogos): Entrada manual (con costo unitario), Salida manual, Ajuste por conteo; motivo
  obligatorio. Usan las RPC `create_manual_movement` y `create_stock_adjustment`.
- **Movimientos** (`/app/inventario/movimientos`): historial con filtros (fecha, tipo, ítem, referencia),
  enlace al documento de origen (compra / orden). **Revertir** un movimiento manual con motivo
  (`reverse_stock_movement`).

### 5.8 Recetas (dentro de la ficha del producto)

- Ver y editar la receta: rendimiento (cantidad que produce), líneas (materia prima, cantidad, % desperdicio).
- Calculadora de requerimientos en la misma pestaña: "para fabricar N" → materiales requeridos y disponibles
  (reutiliza `features/production/logic.ts`, que ya tiene la fórmula con tests).

### 5.9 Compras

- **Lista** (`/app/compras`) con estado (Borrador · Pendiente · Parcial · Recibida · Cerrada · Cancelada),
  proveedor, total, fecha de entrega esperada y marca de vencida.
- **Nueva / editar borrador** (`/app/compras/nueva`, página completa): proveedor (desplegable), fecha esperada,
  líneas (materia prima, cantidad, precio unitario), total en vivo. Sin pantalla de proveedores: se eligen de
  los existentes.
- **Ficha** (`/app/compras/[id]`): líneas con pedido / recibido / pendiente, recepciones con remito,
  acciones: Confirmar, **Recibir** (diálogo con cantidades por línea, n.º de remito, fecha), Revertir
  recepción, Cancelar. RPC existentes de la Etapa 3.

### 5.10 Producción (la funcionalidad central)

- **Lista** (`/app/produccion`): tabla con código, producto, cantidad, progreso, estado, fechas, demorada.
  Vista tablero por estado: opcional (retoque) salvo que salga barata con el kit.
- **Nueva** (`/app/produccion/nueva`): producto, cantidad, fechas, prioridad, responsable (desplegable de
  empleados existentes), personal asignado (opcional). **Vista previa en vivo** de materiales: requerido,
  disponible, faltante. Es la pantalla que más "vende": el visitante debe poder usarla completa.
- **Ficha** (`/app/produccion/[id]`): progreso, materiales (requerido / consumido / devuelto / merma),
  personal, partes de avance, costos **planificado vs real** (total, unitario, desvío $ y %), historial de
  eventos. Acciones según estado: Iniciar, Registrar avance, Enviar a control de calidad, Volver a producción,
  Completar (consumos reales y horas), Cancelar (con devoluciones), **Crear compra con faltantes**.
- Todo vía las RPC de la Etapa 3.

### 5.11 Shell: buscador y alertas

- **Buscador `Ctrl+K`**: productos, materias primas, órdenes de producción y de compra por código o nombre.
- **Campana**: mismas alertas del dashboard (stock bajo/agotado, órdenes demoradas, compras vencidas), en vivo.

### 5.12 Configuración (sólo admin)

- **General**: nombre, razón social, CUIT, dirección, teléfono, email, zona horaria (validada contra
  `pg_timezone_names`, menor diferido de la Etapa 3), desperdicio por defecto, costo hora por defecto,
  permitir stock negativo.
- **Usuarios**: lo existente.
- **Datos demo** (sólo en organizaciones demo): "Restablecer datos demo" (RPC existente) con confirmación.
- Categorías, áreas, proveedores y empleados **no** tienen pantalla ni alta: vienen cargados en la demo. La
  fábrica real del dueño no es un objetivo de esta etapa (sin proveedores no se pueden crear compras ahí);
  el dueño prueba los flujos de escritura como admin de la demo. Un "+ Nuevo" en los desplegables queda como
  posible retoque.

### 5.13 Landing: capturas y textos

- **Capturas reales** tomadas de la demo pública al final de la etapa. Hero: Dashboard. Sección de funcionalidades,
  una pantalla por cuadro: Producción (orden con vista previa de materiales y faltante), Inventario (existencias con
  semáforo y movimientos), Recetas (ficha de producto con receta y costo), Compras (orden con ítems y estado) y
  Costos (costo planificado vs. real en la ficha de producción). `ScreenshotFrame` pasa a mostrar la imagen.
  Mientras las pantallas no existen quedan los marcos vacíos.
- **Textos alineados con lo que existe** (dentro del bloque 4A): "Compras y proveedores" pasa a "Compras" y
  "Costos y reportes" a "Costos"; se ajustan sus puntos para no prometer Proveedores ni Reportes. Se retoca
  el copy de "Solicitar demostración" (5.1).

## 6. Bloques de entrega (cada uno se revisa con el autor)

- **Bloque 4A — Lo que se ve primero**: demo pública anónima (5.1–5.4), Dashboard (5.5), Productos y materias primas con recetas (5.6, 5.8), Inventario (5.7), Configuración (5.12).
- **Bloque 4B — El ciclo**: Compras (5.9), Producción (5.10), buscador y alertas (5.11), costos en las fichas.
- **Cierre de la etapa — Landing con capturas reales** (5.13), una vez construidas las pantallas.

## 7. Decisiones del autor
- Proyecto de portfolio: recortar a lo básico (22/11/2026).
- Demo pública sin cuenta, de solo lectura (opción A), con retoques después.
- Sacar Reportes/CSV y las pantallas de Proveedores, Empleados, Categorías, Áreas y Costos.
- Dos bloques con revisión.
- Landing: "Probar la demo" reemplaza a "Solicitar demostración" (encabezado, hero y cierre); la sección del
  formulario pasa a invitar a recorrer la demo. El código del formulario (`demo-request-form`,
  `submitDemoRequest`) queda en el repo sin enlazar. Se retoca el copy ("videollamada de media hora").

## 8. Decisiones de diseño (propuestas, corregibles)
- Visitante puede abrir formularios y usar cálculos en vivo; sólo guardar se bloquea.
- Demo anónima: sin usuario, sin contraseña y sin rol `viewer`; lectura por RLS para `anon` limitada a la organización demo pública.
- Demo con datos fijos, sin regeneración diaria.
- Costos se muestran dentro de las fichas, no como módulo.
- Buscador y campana se mantienen porque ya están en el shell (no dejar elementos sin función).
- La demo pública es la demo existente del dueño, marcada como pública.
- Las invitaciones siguen creando `admin`.
- `manual_cost` no se muestra; el costo estándar de la interfaz replica la fórmula de la base.
- La fábrica real del dueño no se completa (sin altas de proveedores/empleados/categorías).

## 9. A criterio del constructor
- Marca persistente de la demo pública (columna vs tabla de configuración).
- Vistas/funciones SQL para agregados del dashboard e inventario.
- Detalle visual de cada pantalla dentro del sistema de diseño existente.
- Orden de tareas dentro de cada bloque.
