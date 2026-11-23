import { ClipboardPlus, PackagePlus, ShoppingCart } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function QuickActions() {
  return (
    <>
      <Button variant="outline" asChild>
        <Link href="/app/productos?nuevo=1">
          <PackagePlus aria-hidden />
          Nuevo producto
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href="/app/compras">
          <ShoppingCart aria-hidden />
          Registrar compra
        </Link>
      </Button>
      <Button asChild>
        <Link href="/app/produccion/nueva">
          <ClipboardPlus aria-hidden />
          Nueva orden de producción
        </Link>
      </Button>
    </>
  );
}
