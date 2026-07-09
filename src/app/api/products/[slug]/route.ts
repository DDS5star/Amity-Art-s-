import type { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api";
import { getProductDetail } from "@/server/services/catalog";
import { resolveChannel } from "@/server/middleware/channel";
import { rateLimit } from "@/server/middleware/rate-limit";

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    await rateLimit(req, { key: "products:detail", limit: 240, windowSeconds: 60 });
    const { slug } = await ctx.params;
    const channel = await resolveChannel(req);
    return ok(await getProductDetail(slug, channel));
  } catch (err) {
    return handleApiError(err);
  }
}
