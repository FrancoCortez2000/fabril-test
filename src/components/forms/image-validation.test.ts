import { validateImageFile } from "@/components/forms/image-validation";

test("rechaza formatos no admitidos", () => {
  expect(validateImageFile({ type: "image/gif", size: 1 })).toEqual({
    ok: false,
    error: "Formato no admitido. Usá JPG, PNG o WebP.",
  });
});

test("rechaza imágenes de más de 2 MB", () => {
  expect(validateImageFile({ type: "image/png", size: 3_000_000 })).toEqual({
    ok: false,
    error: "La imagen supera los 2 MB.",
  });
});

test("acepta una imagen WebP liviana", () => {
  expect(validateImageFile({ type: "image/webp", size: 500_000 })).toEqual({ ok: true });
});
