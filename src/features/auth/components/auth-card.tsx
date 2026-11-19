export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div>
      <div className="rounded-xl border bg-surface p-6 sm:p-7">
        <h1 className="font-display text-4xl leading-tight">{title}</h1>
        <p className="mt-2 text-muted-foreground">{description}</p>
        <div className="mt-6">{children}</div>
      </div>
      {footer ? (
        <div className="mt-5 text-center text-13 text-muted-foreground">{footer}</div>
      ) : null}
    </div>
  );
}

/** Aviso mientras la autenticación no está conectada (Etapa 3). */
export const AUTH_PENDING_MESSAGE = "La autenticación se conecta en la Etapa 3";
