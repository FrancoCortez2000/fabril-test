import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto del panel mientras se valida la sesión. */
export function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh w-full" aria-busy="true" aria-label="Cargando el panel">
      <div className="sticky top-0 hidden h-dvh w-62 shrink-0 flex-col gap-3 border-r bg-sidebar p-4 lg:flex">
        <Skeleton className="h-6 w-28" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center gap-3 border-b px-4 md:px-6">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="ml-auto size-8 rounded-full" />
        </div>
        <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
          <Skeleton className="h-9 w-56" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </div>
      </div>
    </div>
  );
}
