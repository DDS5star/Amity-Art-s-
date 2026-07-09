import type { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api";
import { updateUserStatusSchema } from "@/lib/validation/auth";
import { updateUserStatus } from "@/server/services/users";
import { requirePermission } from "@/server/middleware/auth";
import { audit } from "@/server/services/audit";

/** SUPER_ADMIN only: suspend/activate users, promote/demote managers. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(req, "users.manage");
    const { id } = await ctx.params;
    const input = updateUserStatusSchema.parse(await req.json());
    const user = await updateUserStatus(id, input, auth.userId);
    await audit({
      actorId: auth.userId,
      action: `user.${input.action.toLowerCase()}`,
      entityType: "User",
      entityId: id,
      after: { isActive: user.isActive, role: user.role },
    });
    return ok({ id: user.id, isActive: user.isActive, role: user.role });
  } catch (err) {
    return handleApiError(err);
  }
}
