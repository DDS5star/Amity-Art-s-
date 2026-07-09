import type { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api";
import { listProductsQuerySchema } from "@/lib/validation/catalog";
import { listProducts } from "@/server/services/catalog";
import { resolveChannel } from "@/server/middleware/channel";
import { rateLimit } from "@/server/middleware/rate-limit";

export async function GET(req: NextRequest) {
  try {
    await rateLimit(req, { key: "products:list", limit: 120, windowSeconds: 60 });
    const channel = await resolveChannel(req);
    const query = listProductsQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );
    return ok(await listProducts(query, channel));
  } catch (err) {
    return handleApiError(err);
  }
}
