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
  expect(config.mailer_templates_recovery_content).toContain("{{ .ConfirmationURL }}");
  expect(config.mailer_templates_magic_link_content).toContain("{{ .ConfirmationURL }}");
});

test("en desarrollo permite también localhost", () => {
  expect(buildAuthConfig("http://localhost:3000").uri_allow_list).toBe(
    "http://localhost:3000/auth/confirm**",
  );
});
