/**
 * Interruptor del ingreso con usuario. En el sitio público (Vercel) se pone `LOGIN_DISABLED=1`:
 * la demo sigue abierta a cualquiera, pero no existe pantalla de acceso ni se puede iniciar sesión.
 * En tu máquina la variable no está y todo funciona como siempre.
 */
export const LOGIN_PATHS = ["/ingresar", "/recuperar", "/restablecer"] as const;

export function isLoginDisabled(): boolean {
  return process.env.LOGIN_DISABLED === "1";
}

export const LOGIN_DISABLED_MESSAGE = "El ingreso está deshabilitado en este sitio";
