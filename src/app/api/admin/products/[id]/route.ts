import type { NextRequest } from "next/server";
import { ok, handleApiError, notFound } from "@/lib/api";
import { updateProductSchema } from "@/lib/validation/catalog";
import { updateProduct, softDeleteProduct } from "@/server/services/catalog";
import { requirePermission } from "@/server/middleware/auth";
import { audit } from "@/server/services/audit";
import { prisma } from "@/server/db";

/** Admin product detail: full fields + variants + media + tiers. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission(req, "catalog.manage");
    const { id } = await ctx.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        media: { orderBy: { sortOrder: "asc" } },
        priceTiers: { orderBy: { minQty: "asc" } },
        variants: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
          include: {
            attributeValues: {
              include: { attributeValue: { include: { attribute: true } } },
            },
          },
        },
      },
    });
    if (!product || product.deletedAt) throw notFound("Product");
    return ok(product);
  } catch (err) {
    return handleApiError(err);
  }
}

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
