import type { TableParams } from "@/components/data-table/params";

vi.mock("server-only", () => ({}));

type Call = [string, ...unknown[]];
const db = vi.hoisted(() => ({
  calls: [] as Call[],
  responses: [] as {
    data: unknown[];
    count?: number;
    error?: { message: string; code?: string } | null;
  }[],
  tables: {} as Record<string, { data: unknown[]; error?: { message: string } | null }>,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq", "in", "or", "order", "range"]) {
        b[m] = (...args: unknown[]) => {
          db.calls.push([`${table}.${m}`, ...args]);
          return b;
        };
      }
      b.then = (resolve: (v: unknown) => unknown) => {
        if (db.tables[table]) {
          const t = db.tables[table]!;
          return resolve({ data: t.data, error: t.error ?? null });
        }
        return resolve(db.responses.shift() ?? { data: [], count: 0, error: null });
      };
      return b;
    },
  }),
}));

import {
  EMPLOYEE_TABLE_OPTIONS,
  listAreas,
  listEmployeesTable,
} from "@/features/employees/queries";

const ORG = "99999999-9999-4999-8999-999999999999";
const called = (name: string) => db.calls.filter((c) => c[0] === name);
const params = (over: Partial<TableParams> = {}): TableParams => ({
  page: 1,
  pageSize: 25,
  sort: { id: "name", desc: false },
  q: "",
  filters: {},
  ...over,
});
const row = (over = {}) => ({
  id: "e1",
  first_name: "Lucía",
  last_name: "Fernández",
  position: "Operaria",
  area_id: "a1",
  status: "active",
  hourly_cost: 6200,
  ...over,
});

beforeEach(() => {
  db.calls = [];
  db.responses = [];
  db.tables = { areas: { data: [{ id: "a1", name: "Inyección" }] } };
});

test("las opciones de la tabla: orden por nombre y filtro por estado", () => {
  expect(EMPLOYEE_TABLE_OPTIONS.sortable).toContain("name");
  expect(EMPLOYEE_TABLE_OPTIONS.filterable).toContain("estado");
});

test("lista los empleados de la fábrica con su área y el nombre completo", async () => {
  db.responses = [{ data: [row()], count: 1 }];
  const { rows, total } = await listEmployeesTable(ORG, params());
  expect(total).toBe(1);
  expect(rows).toEqual([
    {
      id: "e1",
      firstName: "Lucía",
      lastName: "Fernández",
      name: "Lucía Fernández",
      position: "Operaria",
      areaId: "a1",
      areaName: "Inyección",
      status: "active",
      hourlyCost: 6200,
    },
  ]);
  expect(called("employees.eq")).toContainEqual(["employees.eq", "organization_id", ORG]);
});

test("sin permiso para ver el costo (demo) no se consulta hourly_cost", async () => {
  db.responses = [{ data: [row({ hourly_cost: undefined })], count: 1 }];
  const { rows } = await listEmployeesTable(ORG, params(), { showCost: false });
  const select = called("employees.select")[0]!;
  expect(String(select[1])).not.toContain("hourly_cost");
  expect(rows[0]!.hourlyCost).toBeNull();
});

test("por defecto consulta el costo por hora", async () => {
  db.responses = [{ data: [row()], count: 1 }];
  await listEmployeesTable(ORG, params());
  expect(String(called("employees.select")[0]![1])).toContain("hourly_cost");
});

test("sin área o sin costo queda nulo, no cero", async () => {
  db.responses = [{ data: [row({ area_id: null, hourly_cost: null, position: null })], count: 1 }];
  const { rows } = await listEmployeesTable(ORG, params());
  expect(rows[0]).toMatchObject({ areaName: null, hourlyCost: null, position: null });
});

test("la búsqueda llega saneada y filtra por nombre o cargo", async () => {
  db.responses = [{ data: [], count: 0 }];
  await listEmployeesTable(ORG, params({ q: 'lu,(c)%"' }));
  const [, filter] = called("employees.or")[0]!;
  expect(String(filter)).toContain("first_name.ilike.%lu c%");
  expect(String(filter)).not.toMatch(/[()"*\\]{2}/);
});

test("el filtro de estado sólo acepta estados conocidos", async () => {
  db.responses = [{ data: [], count: 0 }];
  await listEmployeesTable(ORG, params({ filters: { estado: ["active", "hack"] } }));
  expect(called("employees.in")[0]).toEqual(["employees.in", "status", ["active"]]);
});

test("una página fuera de rango termina en la última", async () => {
  db.responses = [
    { data: [], error: { message: "range", code: "PGRST103" } },
    { data: [row()], count: 30 },
    { data: [row({ id: "e2" })], count: 30 },
  ];
  const { rows, total } = await listEmployeesTable(ORG, params({ page: 999 }));
  expect(total).toBe(30);
  expect(rows[0]!.id).toBe("e2");
});

test("un error de la base se propaga", async () => {
  db.responses = [{ data: [], error: { message: "boom" } }];
  await expect(listEmployeesTable(ORG, params())).rejects.toMatchObject({ message: "boom" });
});

test("listAreas devuelve las áreas de la fábrica por nombre", async () => {
  expect(await listAreas(ORG)).toEqual([{ id: "a1", name: "Inyección" }]);
  expect(called("areas.eq")).toContainEqual(["areas.eq", "organization_id", ORG]);
  expect(called("areas.order")[0]).toEqual(["areas.order", "name"]);
});
