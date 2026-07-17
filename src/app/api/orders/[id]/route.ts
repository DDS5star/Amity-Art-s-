import type { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api";
import { getOrder } from "@/server/services/orders";
import { requireAuth, hasPermission } from "@/server/middleware/auth";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req);
    const { id } = await ctx.params;
    const isStaff = hasPermission(auth.role, "orders.view");
    return ok(await getOrder(id, auth.userId, isStaff));
  } catch (err) {
    return handleApiError(err);
  }
}
