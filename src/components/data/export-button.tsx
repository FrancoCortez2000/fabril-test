import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Enlace de descarga (CSV) con aspecto de botón. */
export function ExportButton({ href, label = "Exportar CSV" }: { href: string; label?: string }) {
  return (
    <Button variant="outline" asChild>
      <a href={href} download>
        <Download aria-hidden />
        {label}
      </a>
    </Button>
  );
}
