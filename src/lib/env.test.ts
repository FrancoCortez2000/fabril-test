import { parsePublicEnv } from "@/lib/env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijkl.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_123",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
};

test("devuelve la configuración pública", () => {
  expect(parsePublicEnv(valid)).toEqual({
    supabaseUrl: "https://abcdefghijkl.supabase.co",
    supabaseKey: "sb_publishable_123",
    siteUrl: "http://localhost:3000",
  });
});

test("una variable faltante da un mensaje claro", () => {
  expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: undefined })).toThrow(
    "Falta NEXT_PUBLIC_SUPABASE_URL en .env.local",
  );
  expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" })).toThrow(
    "Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local",
  );
});

test("una URL inválida se rechaza", () => {
  expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "abc" })).toThrow(
    "NEXT_PUBLIC_SUPABASE_URL tiene que ser una URL completa",
  );
});

test("la URL del sitio se normaliza sin barra final", () => {
  expect(parsePublicEnv({ ...valid, NEXT_PUBLIC_SITE_URL: "https://fabril.app/" }).siteUrl).toBe("https://fabril.app");
});
