import { z } from "zod";

import { runAction } from "@/lib/action-core";

const schema = z.object({ name: z.string().min(2, "Muy corto") });
const ctx = async () => ({ orgId: "org-1" });
const noRethrow = () => {};

test("con datos inválidos devuelve fieldErrors y no llama al handler", async () => {
  const handler = vi.fn();
  const res = await runAction({ name: "a" }, { schema, handler }, ctx, noRethrow);
  expect(res).toEqual({ ok: false, error: "Revisá los datos marcados", fieldErrors: { name: ["Muy corto"] } });
  expect(handler).not.toHaveBeenCalled();
});

test("con datos válidos pasa el contexto y devuelve el resultado", async () => {
  const res = await runAction(
    { name: "Bidón" },
    { schema, handler: async (data, c) => `${data.name}@${c.orgId}` },
    ctx,
    noRethrow,
  );
  expect(res).toEqual({ ok: true, data: "Bidón@org-1" });
});

test("un error de Postgres se traduce", async () => {
  const res = await runAction(
    { name: "Bidón" },
    {
      schema,
      handler: async () => {
        throw { code: "P0001", message: "La orden OP-2026-0001 ya no está planificada" };
      },
    },
    ctx,
    noRethrow,
  );
  expect(res).toEqual({ ok: false, error: "La orden OP-2026-0001 ya no está planificada" });
});

test("los errores de control de Next (redirect) se relanzan", async () => {
  const redirect = new Error("NEXT_REDIRECT");
  const rethrow = (e: unknown) => {
    if (e === redirect) throw e;
  };
  await expect(
    runAction(
      { name: "Bidón" },
      {
        schema,
        handler: async () => {
          throw redirect;
        },
      },
      ctx,
      rethrow,
    ),
  ).rejects.toBe(redirect);
});
