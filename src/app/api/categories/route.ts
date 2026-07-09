import type { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api";
import { getCategoryTree } from "@/server/services/catalog";
import { rateLimit } from "@/server/middleware/rate-limit";

export async function GET(req: NextRequest) {
  try {
    await rateLimit(req, { key: "categories", limit: 120, windowSeconds: 60 });
    return ok(await getCategoryTree());
  } catch (err) {
    return handleApiError(err);
  }
}
