import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, handleApiError } from "@/lib/api";
import { estimateForPincode } from "@/server/services/shipping";
import { rateLimit } from "@/server/middleware/rate-limit";

const querySchema = z.object({
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Invalid pincode"),
  productId: z.string().cuid().optional(),
  variantId: z.string().cuid().optional(),
});

/** Delivery ETA — used by BOTH retail and wholesale surfaces. */
export async function GET(req: NextRequest) {
  try {
    await rateLimit(req, { key: "shipping:estimate", limit: 60, windowSeconds: 60 });
    const query = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
    return ok(await estimateForPincode(query));
  } catch (err) {
    return handleApiError(err);
  }
}
