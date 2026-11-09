import { paginate, parseTableParams, serializeTableParams } from "@/components/data-table/params";

const opts = { sortable: ["name"], filterable: ["estado"] };

describe("parseTableParams", () => {
  test("normaliza parámetros manipulados a valores válidos", () => {
    expect(
      parseTableParams(
        {
          page: "-3",
          pageSize: "9999",
          sort: "foo.desc",
          q: "  bidon ",
          estado: "planned,completed",
        },
        opts,
      ),
    ).toEqual({
      page: 1,
      pageSize: 25,
      sort: null,
      q: "bidon",
      filters: { estado: ["planned", "completed"] },
    });
  });

  test("interpreta un orden válido", () => {
    expect(parseTableParams({ sort: "name.desc" }, opts).sort).toEqual({ id: "name", desc: true });
    expect(parseTableParams({ sort: "name.asc" }, opts).sort).toEqual({ id: "name", desc: false });
  });

  test("una página no numérica vuelve a la primera", () => {
    expect(parseTableParams({ page: "abc" }, opts).page).toBe(1);
  });

  test("usa el orden por defecto si no viene ninguno", () => {
    expect(
      parseTableParams({}, { ...opts, defaultSort: { id: "name", desc: false } }).sort,
    ).toEqual({ id: "name", desc: false });
  });

  test("ignora filtros que no están permitidos y valores repetidos en arreglo", () => {
    expect(parseTableParams({ otro: "x", estado: ["a", "b"] }, opts).filters).toEqual({
      estado: ["a", "b"],
    });
  });
});

describe("serializeTableParams", () => {
  test("ida y vuelta conserva los valores", () => {
    const params = {
      page: 3,
      pageSize: 50 as const,
      sort: { id: "name", desc: true },
      q: "balde",
      filters: { estado: ["planned", "completed"] },
    };
    const sp = Object.fromEntries(serializeTableParams(params).entries());
    expect(parseTableParams(sp, opts)).toEqual(params);
  });

  test("omite valores por defecto para mantener la URL limpia", () => {
    expect(
      serializeTableParams({ page: 1, pageSize: 25, q: "", sort: null, filters: {} }).toString(),
    ).toBe("");
  });
});

describe("paginate", () => {
  test("devuelve la porción de la página pedida y el total", () => {
    const rows = Array.from({ length: 30 }, (_, i) => i);
    const result = paginate(rows, { page: 2, pageSize: 25, sort: null, q: "", filters: {} });
    expect(result.rows).toHaveLength(5);
    expect(result.total).toBe(30);
  });
});

describe("paginate con una página fuera de rango", () => {
  test("lleva a la última página existente en lugar de devolver una página vacía", () => {
    const rows = Array.from({ length: 13 }, (_, i) => i);
    const result = paginate(rows, { page: 5, pageSize: 25, sort: null, q: "", filters: {} });
    expect(result.rows).toHaveLength(13);
    expect(result.page).toBe(1);
  });
  test("sin filas, la página efectiva es la primera", () => {
    expect(paginate([], { page: 3, pageSize: 25, sort: null, q: "", filters: {} }).page).toBe(1);
  });
});
