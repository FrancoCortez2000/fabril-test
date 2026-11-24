import { employeeSchema, toEmployeePayload } from "@/features/employees/schemas";

const valid = {
  firstName: "Lucía",
  lastName: "Fernández",
  position: "Operaria de inyectora",
  areaId: "22222222-2222-4222-8222-222222222222",
  hourlyCost: 6200.5,
  status: "active" as const,
};

test("acepta un empleado completo", () => {
  expect(employeeSchema.safeParse(valid).success).toBe(true);
});

test("nombre y apellido son obligatorios y se recortan", () => {
  expect(employeeSchema.safeParse({ ...valid, firstName: "   " }).success).toBe(false);
  expect(employeeSchema.safeParse({ ...valid, lastName: "" }).success).toBe(false);
  const parsed = employeeSchema.parse({ ...valid, firstName: "  Lucía  " });
  expect(parsed.firstName).toBe("Lucía");
});

test("nombre y cargo tienen un máximo de 80 caracteres", () => {
  expect(employeeSchema.safeParse({ ...valid, firstName: "a".repeat(81) }).success).toBe(false);
  expect(employeeSchema.safeParse({ ...valid, position: "a".repeat(81) }).success).toBe(false);
});

test("el costo por hora no puede ser negativo y puede quedar vacío", () => {
  const negative = employeeSchema.safeParse({ ...valid, hourlyCost: -1 });
  expect(negative.success).toBe(false);
  expect(employeeSchema.safeParse({ ...valid, hourlyCost: null }).success).toBe(true);
  expect(employeeSchema.safeParse({ ...valid, hourlyCost: 0 }).success).toBe(true);
});

test("el estado tiene que ser uno de los tres conocidos", () => {
  for (const status of ["active", "on_leave", "inactive"]) {
    expect(employeeSchema.safeParse({ ...valid, status }).success).toBe(true);
  }
  expect(employeeSchema.safeParse({ ...valid, status: "despedido" }).success).toBe(false);
});

test("el área debe ser un uuid o quedar vacía; el id, si viene, también", () => {
  expect(employeeSchema.safeParse({ ...valid, areaId: "x" }).success).toBe(false);
  expect(employeeSchema.safeParse({ ...valid, areaId: null }).success).toBe(true);
  expect(employeeSchema.safeParse({ ...valid, id: "nope" }).success).toBe(false);
});

test("el payload manda null en lugar de textos vacíos", () => {
  expect(toEmployeePayload({ ...valid, position: "  ", hourlyCost: null, areaId: null })).toEqual({
    first_name: "Lucía",
    last_name: "Fernández",
    position: null,
    area_id: null,
    hourly_cost: null,
    status: "active",
  });
});
