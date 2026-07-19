import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, handleApiError } from "@/lib/api";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import { confirmRazorpayPayment } from "@/server/services/orders";

const schema = z.object({
  orderId: z.string().cuid(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  signature: z.string().min(1),
});

/** Checkout success callback: verify HMAC signature and mark the order paid. */
export async function POST(req: NextRequest) {
  try {
    await rateLimit(req, { key: "payments:verify", limit: 20, windowSeconds: 300 });
    const auth = await requireAuth(req);
    const input = schema.parse(await req.json());
    const order = await confirmRazorpayPayment({ userId: auth.userId, ...input });
    return ok({ orderId: order.id, paymentStatus: order.paymentStatus });
  } catch (err) {
    return handleApiError(err);
  }
}
