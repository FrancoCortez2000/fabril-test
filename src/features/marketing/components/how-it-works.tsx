import { STEPS } from "@/features/marketing/content";

/** Secuencia real de uso: la numeración tiene sentido acá. */
export function HowItWorks() {
  return (
    <section
      id="como-funciona"
      aria-labelledby="como-funciona-titulo"
      className="scroll-mt-20 border-b bg-surface"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <h2 id="como-funciona-titulo" className="font-display text-4xl leading-tight">
          Cómo funciona
        </h2>
        <ol className="mt-10 grid gap-10 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative">
              <span className="font-display text-5xl text-brand" aria-hidden>
                {i + 1}
              </span>
              <h3 className="mt-3 text-base font-semibold">{s.title}</h3>
              <p className="mt-2 text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
