import type { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api";
import { logout } from "@/server/services/auth";
import { clearRefreshCookie, getRefreshCookie } from "@/server/middleware/refresh-cookie";

export async function POST(req: NextRequest) {
  try {
    await logout(getRefreshCookie(req));
    const res = ok({ loggedOut: true });
    clearRefreshCookie(res);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
