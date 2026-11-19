/**
 * Configuración de Supabase Auth que aplica `npm run auth:config` (API de administración).
 * Registro público desactivado: las cuentas nacen por `fabrica:crear` o por invitación.
 */
export function buildAuthConfig(siteUrlRaw: string) {
  const siteUrl = siteUrlRaw.replace(/\/+$/, "");
  return {
    disable_signup: true,
    site_url: siteUrl,
    uri_allow_list: `${siteUrl}/auth/confirm**`,
    password_min_length: 8,
    mailer_subjects_recovery: "Elegí una nueva contraseña para FABRIL",
    mailer_templates_recovery_content: emailTemplate(
      "Elegí una nueva contraseña",
      "Recibimos un pedido para cambiar la contraseña de tu cuenta de FABRIL.",
      "Elegir contraseña",
      "Si no lo pediste, ignorá este email: tu contraseña sigue siendo la misma.",
    ),
    mailer_subjects_magic_link: "Tu enlace para ingresar a FABRIL",
    mailer_templates_magic_link_content: emailTemplate(
      "Tu enlace para ingresar",
      "Usá este enlace para entrar a FABRIL y elegir tu contraseña.",
      "Ingresar a FABRIL",
      "El enlace sirve una sola vez. Si no lo esperabas, ignorá este email.",
    ),
  };
}

function emailTemplate(title: string, intro: string, cta: string, note: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#1c2127">
  <p style="font-size:18px;font-weight:bold;letter-spacing:.04em">FABRIL</p>
  <h1 style="font-size:22px;margin:24px 0 8px">${title}</h1>
  <p style="font-size:15px;line-height:1.5">${intro}</p>
  <p style="margin:24px 0"><a href="{{ .ConfirmationURL }}" style="background:#f2a900;color:#1c2127;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:bold">${cta}</a></p>
  <p style="font-size:13px;color:#5b6670;line-height:1.5">${note}</p>
</div>`;
}
