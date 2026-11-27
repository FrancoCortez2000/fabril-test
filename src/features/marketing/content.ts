import {
  Calculator,
  ClipboardList,
  Database,
  Factory,
  FlaskConical,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

export const NAV_LINKS = [
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#como-esta-hecho", label: "Cómo está hecho" },
  { href: "#preguntas", label: "Preguntas" },
] as const;

export const PROBLEMS = [
  {
    title: "La planilla dice una cosa y el depósito, otra",
    body: "Las entradas y salidas se anotan tarde o no se anotan. Cuando hay que vender o producir, nadie está seguro de cuánto queda.",
  },
  {
    title: "La materia prima se termina en medio de una orden",
    body: "La máquina está lista, el personal también, y falta polietileno o colorante porque nadie calculó lo que iba a hacer falta.",
  },
  {
    title: "Nadie sabe cuánto cuesta fabricar cada producto",
    body: "Con precios que cambian todos los meses, el costo de hace tres meses ya no sirve para decidir a cuánto vender.",
  },
] as const;

export type ModuleFeature = {
  id: string;
  icon: LucideIcon;
  title: string;
  summary: string;
  points: string[];
  /** Captura de la pantalla (la genera `npm run capturas`). */
  screenshot: string;
};

export const MODULES: ModuleFeature[] = [
  {
    id: "produccion",
    icon: Factory,
    title: "Producción",
    summary:
      "Cada orden muestra qué se fabrica, quién la lleva, cuánto avanzó y qué materiales consume.",
    points: [
      "Estados claros: planificada, en producción, control de calidad, completada",
      "Partes de avance con unidades buenas y defectuosas",
      "Órdenes demoradas marcadas automáticamente",
    ],
    screenshot: "/capturas/produccion.png",
  },
  {
    id: "inventario",
    icon: Warehouse,
    title: "Inventario",
    summary:
      "El stock se calcula a partir de cada movimiento registrado, con fecha, motivo y responsable.",
    points: [
      "Entradas por compra e ingresos de producción automáticos",
      "Ajustes por conteo físico sin borrar la historia",
      "Alertas de stock bajo y sin stock",
    ],
    screenshot: "/capturas/inventario.png",
  },
  {
    id: "recetas",
    icon: ClipboardList,
    title: "Recetas",
    summary:
      "Definís qué materiales lleva cada producto y FABRIL calcula lo necesario para cualquier cantidad.",
    points: [
      "Cantidades por unidad con su porcentaje de desperdicio",
      "Aviso de faltantes antes de iniciar la producción",
      "Orden de compra armada con lo que falta",
    ],
    screenshot: "/capturas/recetas.png",
  },
  {
    id: "compras",
    icon: ShoppingCart,
    title: "Compras",
    summary:
      "Órdenes de compra con varios materiales, recepción parcial o completa y número de remito.",
    points: [
      "El stock se actualiza al recibir la mercadería",
      "Historial de compras de cada materia prima",
      "Compras con entrega vencida a la vista",
    ],
    screenshot: "/capturas/compras.png",
  },
  {
    id: "costos",
    icon: Calculator,
    title: "Costos",
    summary:
      "Costo estándar de cada producto y comparación entre lo planificado y lo real en cada orden.",
    points: [
      "Materiales a costo promedio, mano de obra y gastos indirectos",
      "Costo planificado y costo real de cada orden de producción",
      "Desvío en pesos y en porcentaje para ver dónde se fue el costo",
    ],
    screenshot: "/capturas/costos.png",
  },
];

export const STEPS = [
  {
    title: "Cargás productos y recetas",
    body: "Tus productos, las materias primas que usan y en qué cantidad, con su porcentaje de desperdicio.",
  },
  {
    title: "Planificás y comprás lo que falta",
    body: "Creás la orden de producción, FABRIL calcula los materiales y te dice qué hay que comprar antes de empezar.",
  },
  {
    title: "Producís y el sistema se actualiza solo",
    body: "Al iniciar se descuentan los materiales; al completar entran las unidades terminadas y queda registrado el costo real.",
  },
] as const;

export const FAQ = [
  {
    q: "¿Mis datos están seguros?",
    a: "Cada fábrica tiene sus datos aislados del resto: nadie de otra empresa puede verlos. Las conexiones van cifradas y los registros de stock no se pueden modificar sin dejar rastro.",
  },
  {
    q: "¿Sirve si no fabrico plásticos?",
    a: "Sí. La demostración usa una fábrica de plásticos, pero el sistema funciona con cualquier producto que se arme a partir de materias primas: alimentos, química, metalúrgica liviana, textil y más.",
  },
  {
    q: "¿Cuánto tarda la puesta en marcha?",
    a: "Depende de cuántos productos tengas. Una fábrica con una veintena de productos suele cargar productos, recetas y stock inicial en pocos días.",
  },
  {
    q: "¿Funciona en el celular?",
    a: "Sí. Funciona en el navegador de cualquier computadora, tablet o celular, así se pueden registrar avances y recepciones desde la planta.",
  },
  {
    q: "¿Puedo probarlo sin registrarme?",
    a: "Sí. Con el botón Probar la demo entrás a una fábrica de ejemplo, sin cuenta y de solo lectura: podés abrir todas las pantallas sin modificar nada.",
  },
  {
    q: "¿Tengo que instalar algo?",
    a: "No. FABRIL funciona en el navegador; sólo necesitás conexión a internet y tu usuario.",
  },
] as const;

/**
 * Diagrama del hero: qué pasa con el stock y el costo en cada paso. Sigue el ejemplo de la
 * calculadora (Bidón 5 L azul: 0,25 kg de Polietileno AD por unidad + 3 % de desperdicio; había
 * 200 kg y faltaban 57,5 kg para 1.000 unidades).
 */
export const FLOW: { title: string; body: string; result: string; icon: LucideIcon }[] = [
  {
    title: "Llega la compra",
    body: "Recibís 500 kg de Polietileno AD a $ 1.000 el kilo.",
    result: "Stock 700 kg · costo promedio al día",
    icon: Truck,
  },
  {
    title: "Planificás la orden",
    body: "1.000 bidones: la receta pide 257,5 kg con el 3 % de desperdicio.",
    result: "Alcanza: ya no falta material",
    icon: ClipboardList,
  },
  {
    title: "Producís",
    body: "Al iniciar se descuentan los materiales; los partes suman 980 buenas y 20 defectuosas.",
    result: "Quedan 442,5 kg de Polietileno AD",
    icon: Factory,
  },
  {
    title: "Cerrás con el costo real",
    body: "Entran 980 bidones al stock, valorizados con lo que realmente se consumió.",
    result: "$ 564 por unidad vs. $ 548 planificados",
    icon: Calculator,
  },
];

/** "Cómo está hecho": lo que la demo no muestra por sí sola. Todo verificable en el código. */
export const BUILD_FACTS: { title: string; body: string; icon: LucideIcon }[] = [
  {
    title: "Cada fábrica, aislada en la base",
    body: "Políticas de seguridad (RLS) en todas las tablas de Postgres: un usuario de otra fábrica no ve ni modifica nada, aunque arme el pedido a mano.",
    icon: ShieldCheck,
  },
  {
    title: "La lógica crítica vive en la base",
    body: "Recibir compras, consumir materiales y cerrar órdenes son funciones de la base que corren en una sola transacción: el stock nunca queda a medias.",
    icon: Database,
  },
  {
    title: "Más de 1.000 pruebas automáticas",
    body: "Unitarias, de componentes y de SQL contra un Postgres real (PGlite): stock, costos, permisos y aislamiento entre fábricas.",
    icon: FlaskConical,
  },
];

export const STACK = [
  "Next.js 16",
  "TypeScript",
  "Supabase",
  "PostgreSQL",
  "Tailwind CSS",
  "shadcn/ui",
  "Recharts",
  "Vitest",
  "Playwright",
] as const;
