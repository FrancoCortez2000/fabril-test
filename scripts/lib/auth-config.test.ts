import { buildAuthConfig } from "./auth-config.mts";

test("desactiva el registro público y limita las redirecciones al sitio", () => {
  const config = buildAuthConfig("https://fabril.app/");
  expect(config).toMatchObject({
    disable_signup: true,
    site_url: "https://fabril.app",
    uri_allow_list: "https://fabril.app/auth/confirm**",
    password_min_length: 8,
    mailer_subjects_recovery: "Elegí una nueva contraseña para FABRIL",
    mailer_subjects_magic_link: "Tu enlace para ingresar a FABRIL",
  });
  // Los enlaces tienen que durar lo que promete la interfaz (24 h).
  expect(config.mailer_otp_exp).toBe(86400);
  // token_hash (no PKCE): el enlace funciona aunque se abra en otro dispositivo o navegador.
  expect(config.mailer_templates_recovery_content).toContain(
    "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/restablecer",
  );
  expect(config.mailer_templates_recovery_content).not.toContain("ConfirmationURL");
  expect(config.mailer_templates_magic_link_content).toContain(
    "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/restablecer",
  );
});

test("en desarrollo permite también localhost", () => {
  expect(buildAuthConfig("http://localhost:3000").uri_allow_list).toBe(
    "http://localhost:3000/auth/confirm**",
  );
});
