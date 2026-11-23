vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  calls: [] as unknown[][],
  row: null as Record<string, unknown> | null,
  error: null as null | { message: string },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    const b: Record<string, unknown> = {};
    for (const method of ["select", "eq"]) {
      b[method] = (...args: unknown[]) => {
        state.calls.push([method, ...args]);
        return b;
      };
    }
    b.maybeSingle = async () => ({ data: state.row, error: state.error });
    return { from: () => b };
  },
}));

import { getOrganizationSettings } from "@/features/settings/queries";

const ORG = "99999999-9999-4999-8999-999999999999";

beforeEach(() => {
  state.calls = [];
  state.error = null;
  state.row = {
    id: ORG,
    name: "Plásticos Sur",
    legal_name: null,
    cuit: "30-71234567-9",
    address: null,
    city: "Rosario",
    province: null,
    phone: null,
    email: null,
    timezone: "America/Argentina/Buenos_Aires",
    default_waste_pct: "3.00",
    default_labor_rate: "6000.00",
    allow_negative_stock: false,
    is_demo: true,
  };
});

describe("getOrganizationSettings", () => {
  test("devuelve los datos de la fábrica con números y vacíos normalizados", async () => {
    expect(await getOrganizationSettings(ORG)).toEqual({
      isDemo: true,
      values: {
        name: "Plásticos Sur",
        legalName: "",
        cuit: "30-71234567-9",
        address: "",
        city: "Rosario",
        province: "",
        phone: "",
        email: "",
        timezone: "America/Argentina/Buenos_Aires",
        defaultWastePct: 3,
        defaultLaborRate: 6000,
        allowNegativeStock: false,
      },
    });
    expect(state.calls).toContainEqual(["eq", "id", ORG]);
  });

  test("devuelve null si la fábrica no existe o no se puede ver", async () => {
    state.row = null;
    expect(await getOrganizationSettings(ORG)).toBeNull();
  });

  test("si la base falla, lanza el error", async () => {
    state.error = { message: "boom" };
    await expect(getOrganizationSettings(ORG)).rejects.toMatchObject({ message: "boom" });
  });
});
