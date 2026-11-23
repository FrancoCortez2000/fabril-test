import { formatQuantity } from "@/lib/format";

/** Cantidad con signo explícito: `+100 kg`, `-25,8 kg`. */
export function signedQuantity(quantity: number, unitCode: string): string {
  return `${quantity > 0 ? "+" : ""}${formatQuantity(quantity, unitCode)}`;
}
