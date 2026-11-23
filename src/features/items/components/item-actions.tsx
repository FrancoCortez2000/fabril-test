"use client";

import { Archive, ArchiveRestore, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { useAccess } from "@/components/layout/access-provider";
import { Button } from "@/components/ui/button";
import { setItemArchived } from "@/features/items/actions";
import { ItemFormDialog } from "@/features/items/components/item-form-dialog";
import { toFormValues } from "@/features/items/form-values";
import { ITEM_LABELS, type ItemCategory, type ItemRow } from "@/features/items/types";

/** Acciones de la ficha: editar y archivar/reactivar. En la demo, Editar abre pero no guarda. */
export function ItemActions({
  item,
  categories,
  suppliers,
}: {
  item: ItemRow;
  categories: ItemCategory[];
  suppliers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { can, mode } = useAccess();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const labels = ITEM_LABELS[item.type];
  const allowed = can("manageCatalog");

  async function toggleArchived(archived: boolean) {
    const result = await setItemArchived({ id: item.id, archived });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(archived ? `Archivaste ${item.name}` : `Reactivaste ${item.name}`);
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" onClick={() => setEditing(true)}>
        <Pencil aria-hidden />
        Editar
      </Button>

      {item.archived ? (
        <Button
          variant="outline"
          disabled={!allowed || pending}
          title={mode === "demo" ? "No disponible en la demo" : undefined}
          onClick={() => startTransition(() => toggleArchived(false))}
        >
          <ArchiveRestore aria-hidden />
          Reactivar
        </Button>
      ) : allowed ? (
        <ConfirmDialog
          destructive
          trigger={
            <Button variant="outline">
              <Archive aria-hidden />
              Archivar
            </Button>
          }
          title={`Archivar ${item.name}`}
          description="Deja de aparecer en las listas y no se puede usar en órdenes nuevas. Conserva su historia y se puede reactivar cuando quieras."
          confirmLabel={`Archivar ${labels.singular}`}
          onConfirm={() => toggleArchived(true)}
        />
      ) : (
        <Button
          variant="outline"
          disabled
          title={mode === "demo" ? "No disponible en la demo" : "No tenés permiso"}
        >
          <Archive aria-hidden />
          Archivar
        </Button>
      )}

      <ItemFormDialog
        open={editing}
        onOpenChange={setEditing}
        kind={item.type}
        categories={categories}
        suppliers={suppliers}
        initialValues={toFormValues(item)}
        unitLocked={item.hasMovements}
      />
    </>
  );
}
