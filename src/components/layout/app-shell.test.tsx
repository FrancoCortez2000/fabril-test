vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  alertsError: false,
  alerts: [] as { kind: string; title: string; detail: string; href: string }[],
}));

vi.mock("@/lib/auth/session", () => ({
  requireSession: async () => ({
    user: { id: "u", name: "Ana", email: "a@a.com" },
    organizations: [{ id: "org-1", name: "Fábrica", isDemo: false, role: "admin" }],
    activeOrganizationId: "org-1",
    role: "admin",
    mode: "member",
  }),
}));
vi.mock("@/features/dashboard/queries", () => ({
  getDashboard: async () => {
    if (state.alertsError) throw new Error("sin conexión");
    return { alerts: state.alerts };
  },
}));
// El shell sólo ensambla: se reemplazan las piezas para mirar qué recibe cada una.
vi.mock("@/components/layout/topbar", () => ({
  Topbar: (props: { alerts: unknown[] }) => ({ type: "topbar", props }),
}));
vi.mock("@/components/layout/app-sidebar", () => ({ AppSidebar: () => null }));
vi.mock("@/components/layout/demo-banner", () => ({ DemoBanner: () => null }));
vi.mock("@/components/layout/access-provider", () => ({
  AccessProvider: ({ children }: { children: unknown }) => children,
}));

import { AppShell } from "@/components/layout/app-shell";

/** Busca recursivamente el elemento Topbar en el árbol devuelto por el server component. */
function findTopbar(node: unknown): { alerts: unknown[] } | null {
  if (!node || typeof node !== "object") return null;
  const el = node as { type?: unknown; props?: Record<string, unknown> };
  if (typeof el.type === "function" && el.type.name === "Topbar") {
    return el.props as { alerts: unknown[] };
  }
  const kids = el.props?.children;
  for (const k of Array.isArray(kids) ? kids : [kids]) {
    const found = findTopbar(k);
    if (found) return found;
  }
  return null;
}

beforeEach(() => {
  state.alertsError = false;
  state.alerts = [];
});

test("pasa las alertas del tablero a la barra superior", async () => {
  state.alerts = [{ kind: "low_stock", title: "PEAD", detail: "Quedan 5 kg", href: "/app/x" }];
  const tree = await AppShell({ children: null });
  expect(findTopbar(tree)?.alerts).toEqual(state.alerts);
});

test("si falla la carga de alertas el shell igual se arma, con la campana vacía", async () => {
  state.alertsError = true;
  const tree = await AppShell({ children: null });
  expect(findTopbar(tree)?.alerts).toEqual([]);
});
