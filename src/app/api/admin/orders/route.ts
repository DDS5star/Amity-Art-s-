import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, handleApiError } from "@/lib/api";
import { requirePermission } from "@/server/middleware/auth";
import { prisma } from "@/server/db";

const query = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z
    .enum([
      "PENDING", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED",
      "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURN_REQUESTED",
      "RETURNED", "REFUNDED",
    ])
    .optional(),
  channel: z.enum(["RETAIL", "WHOLESALE"]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "orders.view");
    const q = query.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
    const where = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.channel ? { channel: q.channel } : {}),
    };
    const [total, items] = await prisma.$transaction([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { placedAt: "desc" },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        select: {
          id: true, orderNumber: true, channel: true, status: true,
          paymentMethod: true, paymentStatus: true, totalAmount: true,
          placedAt: true, dueDate: true,
          user: { select: { firstName: true, lastName: true, email: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);
    return ok({ items, pagination: { page: q.page, limit: q.limit, total } });
  } catch (err) {
    return handleApiError(err);
  }
}
