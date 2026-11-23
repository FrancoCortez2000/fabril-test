import { z } from "zod";

const pct = (label: string) =>
  z
    .number({ error: `Ingresá ${label} como número` })
    .min(0, `${label[0]?.toUpperCase()}${label.slice(1)} no puede ser negativo`)
    .max(100, `${label[0]?.toUpperCase()}${label.slice(1)} no puede superar 100 %`);

export const bomLineSchema = z.object({
  componentItemId: z.uuid("Elegí una materia prima"),
  quantity: z
    .number({ error: "Ingresá la cantidad como número" })
    .positive("La cantidad tiene que ser mayor a cero"),
  /** Desperdicio propio de la línea; `null` usa el de la receta o el de la fábrica. */
  wastePct: pct("el desperdicio").nullable(),
});

/** Receta de un producto: lo que lleva `outputQty` unidades. Compartida por el formulario y la acción. */
export const bomSchema = z
  .object({
    outputQty: z
      .number({ error: "Ingresá el rendimiento como número" })
      .positive("El rendimiento tiene que ser mayor a cero"),
    defaultWastePct: pct("el desperdicio por defecto").nullable(),
    notes: z.string().trim().max(500, "Máximo 500 caracteres"),
    lines: z.array(bomLineSchema).min(1, "La receta necesita al menos una materia prima"),
  })
  .superRefine((bom, ctx) => {
    const seen = new Set<string>();
    bom.lines.forEach((line, index) => {
      if (seen.has(line.componentItemId)) {
        ctx.addIssue({
          code: "custom",
          path: ["lines", index, "componentItemId"],
          message: "Esa materia prima ya está en la receta",
        });
      }
      seen.add(line.componentItemId);
    });
  });

export type BomFormValues = z.infer<typeof bomSchema>;

export const saveBomSchema = z.object({ itemId: z.uuid() }).and(bomSchema);
