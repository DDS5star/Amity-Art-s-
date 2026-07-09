import type { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api";
import { wholesalerReviewSchema } from "@/lib/validation/auth";
import { reviewWholesaler } from "@/server/services/users";
import { requirePermission } from "@/server/middleware/auth";
import { audit } from "@/server/services/audit";

/** SUPER_ADMIN only: approve / reject / suspend / reactivate wholesale accounts. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(req, "wholesalers.approve");
    const { id } = await ctx.params;
    const input = wholesalerReviewSchema.parse(await req.json());
    const profile = await reviewWholesaler(id, input, auth.userId);
    await audit({
      actorId: auth.userId,
      action: `wholesaler.${input.action.toLowerCase()}`,
      entityType: "WholesalerProfile",
      entityId: id,
      after: { status: profile.status },
    });
    return ok(profile);
  } catch (err) {
    return handleApiError(err);
  }
}
