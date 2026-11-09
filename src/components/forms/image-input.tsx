"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { ACCEPTED_IMAGE_TYPES, validateImageFile } from "@/components/forms/image-validation";
import { Button } from "@/components/ui/button";

/**
 * Selección de imagen con vista previa local y validación de formato/tamaño.
 * La subida a Supabase Storage se conecta en la Etapa 3.
 */
export function ImageInput({
  value,
  onChange,
  label = "Imagen",
}: {
  /** URL de la imagen actual, si existe. */
  value?: string | null;
  onChange: (file: File | null) => void;
  label?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(value ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const result = validateImageFile(file);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
    onChange(file);
  }

  function clear() {
    setPreview(null);
    setError(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex items-start gap-4">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-surface-2">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:)
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus aria-hidden className="size-6 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-2">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <label htmlFor={inputId}>
              {preview ? "Cambiar imagen" : `Elegir ${label.toLowerCase()}`}
            </label>
          </Button>
          {preview ? (
            <Button type="button" variant="ghost" size="sm" onClick={clear}>
              <Trash2 aria-hidden />
              Quitar
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">JPG, PNG o WebP, hasta 2 MB.</p>
        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
