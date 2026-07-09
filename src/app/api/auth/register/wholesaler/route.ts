import type { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api";
import { wholesalerApplySchema } from "@/lib/validation/auth";
import { applyAsWholesaler } from "@/server/services/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import { setRefreshCookie, sessionMeta } from "@/server/middleware/refresh-cookie";

/** B2B application: account is created but wholesale access is PENDING approval. */
export async function POST(req: NextRequest) {
  try {
    await rateLimit(req, { key: "auth:register-wholesaler", limit: 3, windowSeconds: 300 });
    const input = wholesalerApplySchema.parse(await req.json());
    const result = await applyAsWholesaler(input, sessionMeta(req));
    const res = ok(
      {
        user: result.user,
        accessToken: result.accessToken,
        wholesalerStatus: "PENDING",
        message: "Application received — our team will review it within 48 hours.",
      },
      { status: 201 },
    );
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
