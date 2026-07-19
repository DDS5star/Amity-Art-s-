import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, handleApiError } from "@/lib/api";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import { createPaymentSession } from "@/server/services/orders";

const schema = z.object({ orderId: z.string().cuid() });

/** "Pay now" for an existing unpaid online order. */
export async function POST(req: NextRequest) {
  try {
    await rateLimit(req, { key: "payments:session", limit: 10, windowSeconds: 300 });
    const auth = await requireAuth(req);
    const { orderId } = schema.parse(await req.json());
    return ok(await createPaymentSession(orderId, auth.userId));
  } catch (err) {
    return handleApiError(err);
  }
}
