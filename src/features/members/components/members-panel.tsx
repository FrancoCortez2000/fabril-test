"use client";

import { Link2, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { regenerateInvite, setMemberStatus } from "@/features/members/actions";
import { InviteDialog } from "@/features/members/components/invite-dialog";
import { InviteLink } from "@/features/members/components/invite-link";
import type { MemberRow } from "@/features/members/schemas";
import { cn } from "@/lib/utils";

const STATE: Record<MemberRow["state"], { label: string; dot: string }> = {
  active: { label: "Activo", dot: "bg-status-completed" },
  pending: { label: "Pendiente", dot: "bg-status-pending" },
  disabled: { label: "Deshabilitado", dot: "bg-muted-foreground" },
};

export function MembersPanel({ members, isDemo }: { members: MemberRow[]; isDemo: boolean }) {
  const [link, setLink] = useState<{ url: string; name: string } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function changeStatus(member: MemberRow, status: "active" | "disabled") {
    const res = await setMemberStatus({ userId: member.userId, status });
    if (!res.ok) {
      toast.error(res.error);
      throw new Error(res.error);
    }
    toast.success(status === "disabled" ? `${member.name} ya no puede ingresar` : `${member.name} puede volver a ingresar`);
  }

  function newLink(member: MemberRow) {
    setPendingId(member.userId);
    startTransition(async () => {
      const res = await regenerateInvite({ userId: member.userId });
      setPendingId(null);
      if (res.ok) setLink({ url: res.data.inviteUrl, name: member.name });
      else toast.error(res.error);
    });
  }

  return (
    <section aria-labelledby="usuarios-titulo" className="rounded-xl border bg-surface">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 id="usuarios-titulo" className="text-lg font-semibold">
            Usuarios
          </h2>
          <p className="text-13 text-muted-foreground">
            {isDemo
              ? "Las organizaciones demo no admiten invitaciones."
              : "Quiénes pueden ingresar al panel de esta fábrica. Todos son administradores."}
          </p>
        </div>
        {isDemo ? null : <InviteDialog />}
      </div>

      <ul className="divide-y">
        {members.map((m) => {
          const state = STATE[m.state];
          return (
            <li key={m.userId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {m.name}
                  {m.isCurrentUser ? <span className="ml-2 text-13 font-normal text-muted-foreground">(vos)</span> : null}
                </p>
                <p className="truncate text-13 text-muted-foreground">{m.email}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-13 sm:w-32">
                <span aria-hidden className={cn("size-2 rounded-full", state.dot)} />
                {state.label}
              </span>
              <div className="flex gap-2 sm:w-44 sm:justify-end">
                {m.isCurrentUser || isDemo ? null : (
                  <>
                    {m.state === "pending" ? (
                      <Button variant="ghost" size="sm" onClick={() => newLink(m)} disabled={pendingId === m.userId}>
                        {pendingId === m.userId ? <Loader2 aria-hidden className="animate-spin" /> : <Link2 aria-hidden />}
                        Nuevo enlace
                      </Button>
                    ) : null}
                    {m.state === "disabled" ? (
                      <ConfirmDialog
                        trigger={
                          <Button variant="outline" size="sm">
                            Habilitar
                          </Button>
                        }
                        title={`¿Habilitar a ${m.name}?`}
                        description="Va a poder volver a ingresar al panel de esta fábrica."
                        confirmLabel="Habilitar"
                        onConfirm={() => changeStatus(m, "active")}
                      />
                    ) : (
                      <ConfirmDialog
                        trigger={
                          <Button variant="outline" size="sm">
                            Deshabilitar
                          </Button>
                        }
                        title={`¿Deshabilitar a ${m.name}?`}
                        description="No va a poder ingresar a esta fábrica. Su historial queda intacto y podés volver a habilitarlo cuando quieras."
                        confirmLabel="Deshabilitar"
                        destructive
                        onConfirm={() => changeStatus(m, "disabled")}
                      />
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog open={link !== null} onOpenChange={(open) => (open ? null : setLink(null))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo enlace de invitación</DialogTitle>
            <DialogDescription>El enlace anterior deja de servir.</DialogDescription>
          </DialogHeader>
          {link ? <InviteLink url={link.url} name={link.name} /> : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
