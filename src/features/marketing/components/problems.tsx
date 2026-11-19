import { PROBLEMS } from "@/features/marketing/content";

export function Problems() {
  return (
    <section aria-labelledby="problemas" className="border-b">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <h2 id="problemas" className="font-display max-w-2xl text-4xl leading-tight">
          Si esto pasa en tu planta, FABRIL es para vos
        </h2>
        <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-3">
          {PROBLEMS.map((p) => (
            <div key={p.title} className="border-l-2 border-brand pl-5">
              <h3 className="text-base font-semibold">{p.title}</h3>
              <p className="mt-2 text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
