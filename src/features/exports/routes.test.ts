vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  orgIds: [] as string[],
  fail: false,
}));

vi.mock("@/lib/auth/session", () => ({
  requireSession: async () => ({ activeOrganizationId: "org-1" }),
}));
vi.mock("@/features/exports/queries", () => {
  const make = (name: string) => async (orgId: string) => {
    state.orgIds.push(orgId);
    if (state.fail) throw new Error("boom");
    return { columns: ["Dato"], rows: [[name]] };
  };
  return {
    exportInventory: make("inventario"),
    exportProduction: make("produccion"),
    exportCosts: make("costos"),
  };
});

import { GET as costs } from "@/app/app/costos/exportar/route";
import { GET as inventory } from "@/app/app/inventario/exportar/route";
import { GET as production } from "@/app/app/produccion/exportar/route";

const TODAY = /^\d{4}-\d{2}-\d{2}$/;

beforeEach(() => {
  state.orgIds = [];
  state.fail = false;
});

test.each([
  ["inventario", inventory],
  ["produccion", production],
  ["costos", costs],
] as const)("%s responde un CSV adjunto de la fábrica activa", async (name, handler) => {
  const res = await handler();
  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/^attachment; filename="([a-z]+)-(.+)\.csv"$/);
  expect(match?.[1]).toBe(name);
  expect(match?.[2]).toMatch(TODAY);
  expect(await res.text()).toContain(`Dato\r\n${name}\r\n`);
  expect(state.orgIds).toEqual(["org-1"]);
});

test("si falla la consulta responde 500 sin filtrar el detalle", async () => {
  state.fail = true;
  const res = await inventory();
  expect(res.status).toBe(500);
  expect(await res.text()).not.toContain("boom");
});
