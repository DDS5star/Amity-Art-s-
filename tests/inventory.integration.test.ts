import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { adjustStock, InsufficientStockError } from "@/lib/inventory";

// Integration test against the real Postgres (docker-compose locally, service in CI).
process.env.DATABASE_URL ??=
  "postgresql://amity:amity_dev_password@localhost:5433/amity_arts?schema=public";

const prisma = new PrismaClient();
let productId: string;
let categoryId: string;

beforeAll(async () => {
  const category = await prisma.category.upsert({
    where: { slug: "test-inventory-cat" },
    update: {},
    create: { name: "Test Inventory", slug: "test-inventory-cat", path: "/test-inventory-cat/" },
  });
  categoryId = category.id;
  // Fresh product each run (delete leftovers first for idempotency).
  await prisma.stockMovement.deleteMany({ where: { product: { sku: "TEST-INV-0001" } } });
  await prisma.product.deleteMany({ where: { sku: "TEST-INV-0001" } });
  const product = await prisma.product.create({
    data: {
      name: "Inventory Race Test",
      slug: `test-inventory-race`,
      sku: "TEST-INV-0001",
      categoryId,
      retailPrice: 100,
      stockQty: 10,
      isActive: false, // never visible in listings
    },
  });
  productId = product.id;
});

afterAll(async () => {
  await prisma.stockMovement.deleteMany({ where: { productId } });
  await prisma.product.delete({ where: { id: productId } }).catch(() => {});
  await prisma.$disconnect();
});

describe("adjustStock — oversell protection under concurrency", () => {
  it("parallel decrements never push stock below zero", async () => {
    // 5 concurrent buyers × 3 units each = 15 demanded, only 10 in stock.
    const attempts = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        prisma.$transaction((tx) =>
          adjustStock(tx, {
            productId,
            delta: -3,
            reason: "ORDER_PLACED",
            referenceType: "Test",
            referenceId: "race",
          }),
        ),
      ),
    );

    const successes = attempts.filter((a) => a.status === "fulfilled").length;
    const failures = attempts.filter(
      (a) => a.status === "rejected" && a.reason instanceof InsufficientStockError,
    ).length;

    expect(successes).toBe(3); // 3 × 3 = 9 ≤ 10; a 4th would need 12
    expect(failures).toBe(2);

    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.stockQty).toBe(1); // 10 - 9

    // Ledger rows exactly match successful decrements.
    const movements = await prisma.stockMovement.findMany({ where: { productId } });
    expect(movements).toHaveLength(3);
    expect(movements.every((m) => m.delta === -3)).toBe(true);
  });

  it("restock writes a positive ledger row", async () => {
    const { stockAfter } = await prisma.$transaction((tx) =>
      adjustStock(tx, { productId, delta: 20, reason: "PURCHASE_INWARD" }),
    );
    expect(stockAfter).toBe(21);
  });

  it("rejects zero delta", async () => {
    await expect(
      prisma.$transaction((tx) => adjustStock(tx, { productId, delta: 0, reason: "CORRECTION" })),
    ).rejects.toThrow(/non-zero/);
  });
});
