import type { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { REFRESH_COOKIE } from "@/lib/tokens";

export function setRefreshCookie(res: NextResponse, token: string, expiresAt: Date) {
  res.cookies.set(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    expires: expiresAt,
  });
}

export function clearRefreshCookie(res: NextResponse) {
  res.cookies.set(REFRESH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 0,
  });
}

export const getRefreshCookie = (req: NextRequest) =>
  req.cookies.get(REFRESH_COOKIE)?.value ?? null;

export const sessionMeta = (req: NextRequest) => ({
  userAgent: req.headers.get("user-agent"),
  ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
});
