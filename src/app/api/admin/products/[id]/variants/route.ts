import type { NextRequest } from "next/server";
import { created, handleApiError } from "@/lib/api";
import { createVariantSchema } from "@/lib/validation/catalog";
import { createVariant } from "@/server/services/catalog";
import { requirePermission } from "@/server/middleware/auth";
import { audit } from "@/server/services/audit";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(req, "catalog.manage");
    const { id } = await ctx.params;
    const input = createVariantSchema.parse(await req.json());
    const variant = await createVariant(id, input);
    await audit({
      actorId: auth.userId,
      action: "variant.create",
      entityType: "ProductVariant",
      entityId: variant.id,
      after: { sku: variant.sku, title: variant.title },
    });
    return created(variant);
  } catch (err) {
    return handleApiError(err);
  }
}
