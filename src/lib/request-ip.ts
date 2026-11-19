/** IP del visitante según las cabeceras del proxy (Vercel completa `x-forwarded-for`). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const real = headers.get("x-real-ip")?.trim();
  return real || "unknown";
}
