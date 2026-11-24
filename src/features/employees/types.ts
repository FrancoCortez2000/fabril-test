export type EmployeeStatus = "active" | "on_leave" | "inactive";

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: "Activo",
  on_leave: "De licencia",
  inactive: "Inactivo",
};

export type EmployeeRow = {
  id: string;
  firstName: string;
  lastName: string;
  /** Nombre completo para mostrar. */
  name: string;
  position: string | null;
  areaId: string | null;
  areaName: string | null;
  status: EmployeeStatus;
  hourlyCost: number | null;
};

export type AreaOption = { id: string; name: string };
