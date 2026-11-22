"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Enlace de invitación para copiar y compartir (WhatsApp, email). */
export function InviteLink({ url, name }: { url: string; name: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No pudimos copiarlo: seleccioná el enlace y copialo a mano");
    }
  }

  return (
    <div className="space-y-3">
      <label htmlFor="invite-url" className="text-13 font-medium">
        Enlace de invitación
      </label>
      <div className="flex gap-2">
        <Input
          id="invite-url"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="font-mono text-xs"
        />
        <Button type="button" onClick={copy} className="shrink-0">
          <Copy aria-hidden />
          Copiar enlace
        </Button>
      </div>
      <p className="text-13 text-muted-foreground">
        Mandáselo a {name} por WhatsApp o email. Con ese enlace elige su contraseña y entra a la
        fábrica. Vence en 24 horas y sirve una sola vez.
      </p>
    </div>
  );
}
