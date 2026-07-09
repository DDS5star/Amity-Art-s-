import type { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api";
import { registerSchema } from "@/lib/validation/auth";
import { registerCustomer } from "@/server/services/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import { setRefreshCookie, sessionMeta } from "@/server/middleware/refresh-cookie";

export async function POST(req: NextRequest) {
  try {
    await rateLimit(req, { key: "auth:register", limit: 5, windowSeconds: 300 });
    const input = registerSchema.parse(await req.json());
    const result = await registerCustomer(input, sessionMeta(req));
    const res = ok({ user: result.user, accessToken: result.accessToken }, { status: 201 });
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
