import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

// Imagen que muestran WhatsApp, LinkedIn y demás al compartir el link. Se genera en el build.
// Usa la misma Archivo de la landing (instancias fijas; licencia OFL junto a las fuentes).

export const alt = "FABRIL — Sabé qué fabricar, con qué material y a qué costo.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Se leen una vez al cargar el módulo (no cambian entre pedidos): así la imagen se genera en el build.
const [condensed, regular] = await Promise.all([
  readFile(join(process.cwd(), "src/features/marketing/og/archivo-condensed-600.ttf")),
  readFile(join(process.cwd(), "src/features/marketing/og/archivo-400.ttf")),
]);

// Colores del tema claro (globals.css).
const INK = "#1c2127";
const MUTED = "#5b6670";
const PAPER = "#f3f4f6";
const BRAND = "#f2a900";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: PAPER,
          color: INK,
          fontFamily: "Archivo",
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "64px 80px" }}>
          {/* Marca: el techo en diente de sierra, con el último diente en amarillo. */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width="56" height="48" viewBox="0 0 28 24">
              <path d="M1 23V13l8-6v6l8-6v6l8-6v16H1Z" fill={INK} />
              <path d="M17 13l8-6v6Z" fill={BRAND} />
              <rect x="5" y="16" width="3" height="7" fill={PAPER} />
              <rect x="12" y="16" width="3" height="7" fill={PAPER} />
            </svg>
            <span
              style={{ fontFamily: "Archivo Condensed", fontSize: 40, letterSpacing: "0.06em" }}
            >
              FABRIL
            </span>
          </div>

          <div style={{ flex: 1 }} />

          <div
            style={{
              fontFamily: "Archivo Condensed",
              fontSize: 92,
              lineHeight: 1.02,
              letterSpacing: "-0.01em",
              maxWidth: 980,
            }}
          >
            Sabé qué fabricar, con qué material y a qué costo.
          </div>
          <div style={{ marginTop: 28, fontSize: 32, color: MUTED }}>
            Producción, stock, recetas, compras y costos en un solo lugar.
          </div>
          <div style={{ display: "flex", marginTop: 40 }}>
            <span
              style={{
                background: BRAND,
                color: INK,
                fontFamily: "Archivo Condensed",
                fontSize: 28,
                padding: "10px 22px",
                borderRadius: 10,
              }}
            >
              Demo abierta, sin registrarse
            </span>
          </div>
        </div>
        <div style={{ height: 14, background: BRAND }} />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo Condensed", data: condensed, style: "normal", weight: 600 },
        { name: "Archivo", data: regular, style: "normal", weight: 400 },
      ],
    },
  );
}
