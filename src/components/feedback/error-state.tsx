"use client";

import { RotateCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "No se pudo cargar esta sección",
  description,
  onRetry,
}: {
  title?: string;
  description: React.ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-5"
    >
      <div className="flex items-center gap-2 font-semibold text-destructive">
        <TriangleAlert aria-hidden className="size-4" />
        {title}
      </div>
      <p className="text-muted-foreground">{description}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw aria-hidden />
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}
