import type { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api";
import { requireAuth, hasPermission } from "@/server/middleware/auth";
import { forbidden } from "@/lib/api";
import { prisma } from "@/server/db";

/** Dashboard KPIs. MANAGER sees catalog stats; order/revenue arrive with checkout. */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    if (!hasPermission(ctx.role, "catalog.manage")) throw forbidden();

    const [
      productCount,
      activeProductCount,
      lowStock,
      categoryCount,
      customerCount,
      wholesalerPending,
      wholesalerApproved,
      orderCount,
      recentAudit,
    ] = await prisma.$transaction([
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.product.count({ where: { deletedAt: null, isActive: true } }),
      prisma.product.findMany({
        where: { deletedAt: null, isActive: true, stockQty: { lte: prisma.product.fields.lowStockAlert } },
        select: { id: true, name: true, sku: true, stockQty: true, lowStockAlert: true },
        orderBy: { stockQty: "asc" },
        take: 8,
      }),
      prisma.category.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { role: "CUSTOMER", deletedAt: null } }),
      prisma.wholesalerProfile.count({ where: { status: "PENDING" } }),
      prisma.wholesalerProfile.count({ where: { status: "APPROVED" } }),
      prisma.order.count(),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { actor: { select: { firstName: true, lastName: true, email: true } } },
      }),
    ]);

    return ok({
      products: { total: productCount, active: activeProductCount },
      lowStock,
      categories: categoryCount,
      customers: customerCount,
      wholesalers: { pending: wholesalerPending, approved: wholesalerApproved },
      orders: { total: orderCount },
      recentAudit,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
