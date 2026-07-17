import type { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api";
import { requireApprovedWholesaler } from "@/server/middleware/auth";
import { prisma } from "@/server/db";
import { resolveUnitPrice } from "@/lib/pricing";

/**
 * Wholesale ordering grid data: one row per product × matrixKey group,
 * one column per size-axis value; non-variant products get a single column.
 */
export async function GET(req: NextRequest) {
  try {
    await requireApprovedWholesaler(req);

    const sizeAttr = await prisma.attribute.findFirst({ where: { isSizeAxis: true }, include: { values: { orderBy: { sortOrder: "asc" } } } });
    const sizeCodes = sizeAttr?.values.map((v) => v.code) ?? [];

    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        visibility: { in: ["WHOLESALE", "BOTH"] },
        wholesalePrice: { not: null },
      },
      orderBy: { name: "asc" },
      include: {
        media: { where: { type: "IMAGE" }, orderBy: { sortOrder: "asc" }, take: 1 },
        priceTiers: { where: { isActive: true, channel: "WHOLESALE" }, orderBy: { minQty: "asc" } },
        variants: {
          where: { deletedAt: null, isActive: true },
          orderBy: { sortOrder: "asc" },
          include: {
            attributeValues: { include: { attributeValue: { include: { attribute: true } } } },
          },
        },
      },
    });

    const rows = products.flatMap((p) => {
      const pricingProduct = {
        retailPrice: Number(p.retailPrice),
        wholesalePrice: Number(p.wholesalePrice),
        discountType: p.discountType,
        discountValue: p.discountValue ? Number(p.discountValue) : null,
      };
      const base = {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        image: p.media[0]?.thumbnailUrl ?? p.media[0]?.url ?? null,
        weightGrams: p.weightGrams ? Number(p.weightGrams) : null,
        taxRatePercent: Number(p.taxRatePercent),
        basePrice: resolveUnitPrice({ channel: "WHOLESALE", product: pricingProduct, quantity: 1 }),
        moq: p.moqWholesale,
        packSize: p.packSize,
        tiers: p.priceTiers.map((t) => ({
          minQty: t.minQty,
          price: t.price ? Number(t.price) : null,
          discountPercent: t.discountPercent ? Number(t.discountPercent) : null,
        })),
      };

      interface Cell {
        size: string | null;
        variantId: string | null;
        stockQty: number;
      }
      if (!p.hasVariants || p.variants.length === 0) {
        const cells: Cell[] = [{ size: null, variantId: null, stockQty: p.stockQty }];
        return [{ ...base, matrixKey: null as string | null, cells }];
      }

      // Group variants by matrixKey; each size value becomes a cell.
      const groups = new Map<string, typeof p.variants>();
      for (const v of p.variants) {
        const key = v.matrixKey ?? "";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(v);
      }

      return [...groups.entries()].map(([key, variants]) => {
        const label = variants[0].attributeValues
          .filter((av) => !av.attributeValue.attribute.isSizeAxis)
          .map((av) => av.attributeValue.value)
          .join(" / ");
        return {
          ...base,
          matrixKey: key || null,
          name: label ? `${p.name} — ${label}` : p.name,
          cells: variants.map((v): Cell => {
            const size = v.attributeValues.find((av) => av.attributeValue.attribute.isSizeAxis);
            return {
              size: size?.attributeValue.code ?? null,
              variantId: v.id,
              stockQty: v.stockQty,
            };
          }),
        };
      });
    });

    return ok({ sizeColumns: sizeCodes, rows });
  } catch (err) {
    return handleApiError(err);
  }
}
