import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, handleApiError, notFound } from "@/lib/api";
import { requirePermission } from "@/server/middleware/auth";
import { audit } from "@/server/services/audit";
import { prisma } from "@/server/db";
import { adjustStock } from "@/lib/inventory";

const stockSchema = z.object({
  delta: z.number().int().refine((n) => n !== 0, "Delta must be non-zero"),
  variantId: z.string().cuid().optional(),
  reason: z.enum(["PURCHASE_INWARD", "MANUAL_ADJUSTMENT", "DAMAGE", "CORRECTION", "RETURN_RESTOCK"]),
  note: z.string().max(300).optional(),
});

/** Manual stock movement — writes the ledger row in the same transaction. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(req, "inventory.manage");
    const { id } = await ctx.params;
    const input = stockSchema.parse(await req.json());

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product || product.deletedAt) throw notFound("Product");

    const result = await prisma.$transaction((tx) =>
      adjustStock(tx, {
        productId: id,
        variantId: input.variantId,
        delta: input.delta,
        reason: input.reason,
        note: input.note,
        actorId: auth.userId,
      }),
    );

    await audit({
      actorId: auth.userId,
      action: "inventory.adjust",
      entityType: input.variantId ? "ProductVariant" : "Product",
      entityId: input.variantId ?? id,
      after: { delta: input.delta, reason: input.reason, stockAfter: result.stockAfter },
    });

    return ok(result);
  } catch (err) {
    return handleApiError(err);
  }
}
