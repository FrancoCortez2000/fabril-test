import {
  Calculator,
  ClipboardList,
  Factory,
  ShoppingCart,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

export const NAV_LINKS = [
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#como-funciona", label: "Cómo funciona" },
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
  },
  {
    id: "compras",
    icon: ShoppingCart,
    title: "Compras y proveedores",
    summary:
      "Órdenes de compra con varios materiales, recepción parcial o completa y número de remito.",
    points: [
      "El stock se actualiza al recibir la mercadería",
      "Historial de compras y precios por proveedor",
      "Compras con entrega vencida a la vista",
    ],
  },
  {
    id: "costos",
    icon: Calculator,
    title: "Costos y reportes",
    summary:
      "Costo estándar de cada producto y comparación entre lo planificado y lo real en cada orden.",
    points: [
      "Materiales a costo promedio, mano de obra y gastos indirectos",
      "Producción, consumo y desperdicio por período",
      "Exportación a CSV para tu contador o tu planilla",
    ],
  },
];

export const STEPS = [
  {
    title: "Cargás productos y recetas",
    body: "Tus productos, las materias primas que usan y en qué cantidad. Si ya tenés una planilla, te ayudamos a pasarla.",
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
    q: "¿Puedo cargar lo que ya tengo en Excel?",
    a: "Sí. Te acompañamos para pasar tus productos, materias primas y stock actual desde tus planillas.",
  },
  {
    q: "¿Tengo que instalar algo?",
    a: "No. FABRIL funciona en el navegador; sólo necesitás conexión a internet y tu usuario.",
  },
] as const;
