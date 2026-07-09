import type { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api";
import { updateCategorySchema } from "@/lib/validation/catalog";
import { updateCategory } from "@/server/services/catalog";
import { requirePermission } from "@/server/middleware/auth";
import { audit } from "@/server/services/audit";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(req, "catalog.manage");
    const { id } = await ctx.params;
    const input = updateCategorySchema.parse(await req.json());
    const category = await updateCategory(id, input);
    await audit({
      actorId: auth.userId,
      action: "category.update",
      entityType: "Category",
      entityId: id,
      after: input,
    });
    return ok(category);
  } catch (err) {
    return handleApiError(err);
  }
}
