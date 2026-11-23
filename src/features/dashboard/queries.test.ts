const ITEM = "11111111-1111-4111-8111-111111111111";

vi.mock("server-only", () => ({}));

const rpcResults = vi.hoisted(() => ({
  calls: [] as { name: string; args: unknown }[],
  dashboard: null as unknown,
  activity: [] as unknown[],
  error: null as { message: string } | null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: async (name: string, args: unknown) => {
      rpcResults.calls.push({ name, args });
      if (rpcResults.error) return { data: null, error: rpcResults.error };
      return {
        data: name === "dashboard_data" ? rpcResults.dashboard : rpcResults.activity,
        error: null,
      };
    },
  }),
}));

import { getDashboard } from "@/features/dashboard/queries";

const DASHBOARD = {
  asOf: "2026-11-10",
  kpis: {
    products: 1,
    rawMaterials: 4,
    inventoryValue: 30100,
    activeOrders: 2,
    unitsThisMonth: 700,
    unitsSamePeriodLastMonth: 250,
  },
  monthlyProduction: [{ month: "2026-11", units: 700 }],
  inventoryFlow: [{ month: "2026-11", inValue: 14000, outValue: 2400 }],
  alerts: [
    {
      kind: "low_stock",
      title: "Colorante con stock bajo",
      detail: "Quedan 50 kg (mínimo 100)",
      entityType: "item",
      entityId: ITEM,
      itemType: "raw_material",
    },
  ],
};

beforeEach(() => {
  rpcResults.calls = [];
  rpcResults.dashboard = DASHBOARD;
  rpcResults.activity = [
    {
      id: "a1",
      summary: "Registró una entrada manual",
      actor_name: "Ana",
      occurred_at: "2026-11-10T13:00:00+00:00",
      entity_type: "item",
      entity_id: ITEM,
    },
  ];
  rpcResults.error = null;
});

describe("getDashboard", () => {
  test("pide el dashboard y la actividad de la fábrica indicada", async () => {
    await getDashboard("org-1");
    expect(rpcResults.calls).toEqual(
      expect.arrayContaining([
        { name: "dashboard_data", args: { p_org: "org-1" } },
        { name: "recent_activity", args: { p_org: "org-1", p_limit: 8 } },
      ]),
    );
  });

  test("arma las alertas con su enlace y la actividad con el formato del tablero", async () => {
    const data = await getDashboard("org-1");
    expect(data.asOf).toBe("2026-11-10");
    expect(data.kpis.inventoryValue).toBe(30100);
    expect(data.alerts).toEqual([
      {
        kind: "low_stock",
        title: "Colorante con stock bajo",
        detail: "Quedan 50 kg (mínimo 100)",
        href: `/app/materias-primas/${ITEM}`,
      },
    ]);
    expect(data.activity).toEqual([
      {
        id: "a1",
        summary: "Registró una entrada manual",
        actor: "Ana",
        at: "2026-11-10T13:00:00+00:00",
      },
    ]);
  });

  test("si la base falla, lanza el error", async () => {
    rpcResults.error = { message: "boom" };
    await expect(getDashboard("org-1")).rejects.toMatchObject({ message: "boom" });
  });

  test("si la respuesta no respeta el contrato, lanza", async () => {
    rpcResults.dashboard = { asOf: "ayer" };
    await expect(getDashboard("org-1")).rejects.toThrow();
  });
});
