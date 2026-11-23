import { DEMO_COOKIE, demoSession } from "@/lib/auth/demo";
import { can, PERMISSIONS, type Permission } from "@/lib/auth/permissions";

describe("demoSession", () => {
  const session = demoSession({ id: "org-1", name: "Plásticos del Litoral S.A." });

  test("es una sesión de modo demo, sin rol y con una única fábrica demo", () => {
    expect(session.mode).toBe("demo");
    expect(session.role).toBeNull();
    expect(session.activeOrganizationId).toBe("org-1");
    expect(session.organizations).toEqual([
      { id: "org-1", name: "Plásticos del Litoral S.A.", isDemo: true, role: null },
    ]);
    expect(session.user).toEqual({ id: "demo", name: "Visitante", email: "" });
  });

  test("la cookie-bandera tiene un nombre fijo", () => {
    expect(DEMO_COOKIE).toBe("fabril_demo");
  });
});

describe("can sin rol", () => {
  test.each(Object.keys(PERMISSIONS) as Permission[])("%s es falso para null", (permission) => {
    expect(can(null, permission)).toBe(false);
    expect(can(undefined, permission)).toBe(false);
  });

  test("el administrador conserva todos los permisos", () => {
    for (const permission of Object.keys(PERMISSIONS) as Permission[]) {
      expect(can("admin", permission)).toBe(true);
    }
  });
});
