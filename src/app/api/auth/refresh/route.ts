import type { NextRequest } from "next/server";
import { ok, handleApiError, unauthorized } from "@/lib/api";
import { rotateRefreshToken } from "@/server/services/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import { setRefreshCookie, getRefreshCookie, sessionMeta } from "@/server/middleware/refresh-cookie";

export async function POST(req: NextRequest) {
  try {
    await rateLimit(req, { key: "auth:refresh", limit: 30, windowSeconds: 300 });
    const raw = getRefreshCookie(req);
    if (!raw) throw unauthorized("No refresh token");
    const result = await rotateRefreshToken(raw, sessionMeta(req));
    const res = ok({ user: result.user, accessToken: result.accessToken });
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
