import { CircleAlert, CircleCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/** Mensaje del servidor dentro de un formulario: error (`alert`) o confirmación (`status`). */
export function FormAlert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success";
  children: React.ReactNode;
}) {
  const Icon = tone === "error" ? CircleAlert : CircleCheck;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-13",
        tone === "error"
          ? "border-destructive/30 bg-destructive/5 text-foreground"
          : "border-status-completed/30 bg-status-completed/5 text-foreground",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-4 shrink-0",
          tone === "error" ? "text-destructive" : "text-status-completed",
        )}
      />
      <div>{children}</div>
    </div>
  );
}
