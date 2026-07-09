import type { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api";
import { updateProductSchema } from "@/lib/validation/catalog";
import { updateProduct, softDeleteProduct } from "@/server/services/catalog";
import { requirePermission } from "@/server/middleware/auth";
import { audit } from "@/server/services/audit";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(req, "catalog.manage");
    const { id } = await ctx.params;
    const input = updateProductSchema.parse(await req.json());
    const product = await updateProduct(id, input);
    await audit({
      actorId: auth.userId,
      action: "product.update",
      entityType: "Product",
      entityId: id,
      after: input,
    });
    return ok(product);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(req, "catalog.manage");
    const { id } = await ctx.params;
    const product = await softDeleteProduct(id);
    await audit({
      actorId: auth.userId,
      action: "product.delete",
      entityType: "Product",
      entityId: id,
      after: { deletedAt: product.deletedAt },
    });
    return ok({ id, deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
