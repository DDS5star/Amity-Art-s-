import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, created, handleApiError } from "@/lib/api";
import { createProductSchema } from "@/lib/validation/catalog";
import { createProduct } from "@/server/services/catalog";
import { requirePermission } from "@/server/middleware/auth";
import { audit } from "@/server/services/audit";
import { prisma } from "@/server/db";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().max(120).optional(),
  status: z.enum(["active", "inactive", "all"]).default("all"),
  lowStock: z.coerce.boolean().optional(),
});

/** Admin product table: includes inactive products, stock and variant counts. */
export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "catalog.manage");
    const q = listQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));

    const where = {
      deletedAt: null,
      ...(q.status === "active" ? { isActive: true } : {}),
      ...(q.status === "inactive" ? { isActive: false } : {}),
      ...(q.lowStock ? { stockQty: { lte: prisma.product.fields.lowStockAlert } } : {}),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: "insensitive" as const } },
              { sku: { contains: q.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, items] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        select: {
          id: true, name: true, slug: true, sku: true, isActive: true,
          retailPrice: true, wholesalePrice: true, stockQty: true,
          lowStockAlert: true, hasVariants: true, visibility: true,
          updatedAt: true,
          category: { select: { name: true } },
          media: {
            where: { type: "IMAGE" },
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { thumbnailUrl: true, url: true },
          },
          _count: { select: { variants: { where: { deletedAt: null } } } },
        },
      }),
    ]);

    return ok({ items, pagination: { page: q.page, limit: q.limit, total } });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission(req, "catalog.manage");
    const input = createProductSchema.parse(await req.json());
    const product = await createProduct(input);
    await audit({
      actorId: ctx.userId,
      action: "product.create",
      entityType: "Product",
      entityId: product.id,
      after: { name: product.name, sku: product.sku },
    });
    return created(product);
  } catch (err) {
    return handleApiError(err);
  }
}
