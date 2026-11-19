/** Primer elemento enfocable: permite saltear la navegación con el teclado. */
export function SkipLink() {
  return (
    <a
      href="#contenido"
      className="fixed top-2 left-2 z-50 -translate-y-16 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-md transition-transform focus-visible:translate-y-0"
    >
      Saltar al contenido
    </a>
  );
}
