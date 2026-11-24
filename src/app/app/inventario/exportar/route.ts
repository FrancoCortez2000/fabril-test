import { exportInventory } from "@/features/exports/queries";
import { exportRoute } from "@/features/exports/route";

export const GET = exportRoute("inventario", exportInventory);
