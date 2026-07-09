import type { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api";
import { loginSchema } from "@/lib/validation/auth";
import { login } from "@/server/services/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import { setRefreshCookie, sessionMeta } from "@/server/middleware/refresh-cookie";

export async function POST(req: NextRequest) {
  try {
    await rateLimit(req, { key: "auth:login", limit: 10, windowSeconds: 300 });
    const input = loginSchema.parse(await req.json());
    const result = await login(input, sessionMeta(req));
    const res = ok({ user: result.user, accessToken: result.accessToken });
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
