import { Prisma, StockMovementReason } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export class InsufficientStockError extends Error {
  constructor(public sku: string) {
    super(`Insufficient stock for ${sku}`);
  }
}

/**
 * Atomically adjust stock and write the StockMovement ledger row.
 * Oversell-safe: decrements use a conditional UPDATE (no read-then-write race);
 * the DB CHECK (stockQty >= 0) is the final backstop.
 * Must run inside a transaction (pass the tx client).
 */
export async function adjustStock(
  tx: Tx,
  params: {
    productId: string;
    variantId?: string | null;
    delta: number; // signed: negative = sale, positive = restock
    reason: StockMovementReason;
    referenceType?: string;
    referenceId?: string;
    note?: string;
    actorId?: string | null;
  },
): Promise<{ stockAfter: number }> {
  const { productId, variantId, delta, reason, referenceType, referenceId, note, actorId } = params;
  if (delta === 0) throw new Error("delta must be non-zero");

  let stockAfter: number;

  if (variantId) {
    // Conditional decrement guards oversell; increments always pass.
    const updated = await tx.$queryRaw<{ stockQty: number }[]>`
      UPDATE "ProductVariant"
      SET "stockQty" = "stockQty" + ${delta}, "updatedAt" = now()
      WHERE "id" = ${variantId} AND "stockQty" + ${delta} >= 0
      RETURNING "stockQty"`;
    if (updated.length === 0) {
      const v = await tx.productVariant.findUnique({ where: { id: variantId }, select: { sku: true } });
      throw new InsufficientStockError(v?.sku ?? variantId);
    }
    stockAfter = updated[0].stockQty;

    // Keep the product-level rollup cache in sync (never below zero).
    await tx.$executeRaw`
      UPDATE "Product"
      SET "stockQty" = GREATEST("stockQty" + ${delta}, 0), "updatedAt" = now()
      WHERE "id" = ${productId}`;
  } else {
    const updated = await tx.$queryRaw<{ stockQty: number }[]>`
      UPDATE "Product"
      SET "stockQty" = "stockQty" + ${delta}, "updatedAt" = now()
      WHERE "id" = ${productId} AND "stockQty" + ${delta} >= 0
      RETURNING "stockQty"`;
    if (updated.length === 0) {
      const p = await tx.product.findUnique({ where: { id: productId }, select: { sku: true } });
      throw new InsufficientStockError(p?.sku ?? productId);
    }
    stockAfter = updated[0].stockQty;
  }

  await tx.stockMovement.create({
    data: {
      productId,
      variantId: variantId ?? null,
      delta,
      reason,
      referenceType,
      referenceId,
      note,
      stockAfter,
      createdById: actorId ?? null,
    },
  });

  return { stockAfter };
}
