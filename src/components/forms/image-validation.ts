export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export type ImageValidation = { ok: true } | { ok: false; error: string };

export function validateImageFile(file: { type: string; size: number }): ImageValidation {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, error: "Formato no admitido. Usá JPG, PNG o WebP." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "La imagen supera los 2 MB." };
  }
  return { ok: true };
}
