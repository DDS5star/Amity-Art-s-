import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, created, handleApiError } from "@/lib/api";
import { createOrderSchema } from "@/lib/validation/orders";
import { createOrder, listMyOrders } from "@/server/services/orders";
import { requireAuth } from "@/server/middleware/auth";
import { resolveChannel } from "@/server/middleware/channel";
import { rateLimit } from "@/server/middleware/rate-limit";

export async function POST(req: NextRequest) {
  try {
    await rateLimit(req, { key: "orders:create", limit: 10, windowSeconds: 300, failOpen: false });
    const ctx = await requireAuth(req);
    const channel = await resolveChannel(req);
    const input = createOrderSchema.parse(await req.json());
    const order = await createOrder(ctx.userId, channel, input);
    return created({
      id: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      status: order.status,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    const q = listQuery.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
    return ok(await listMyOrders(ctx.userId, q.page, q.limit));
  } catch (err) {
    return handleApiError(err);
  }
}
