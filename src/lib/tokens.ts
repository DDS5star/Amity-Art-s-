import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "crypto";
import type { Role } from "@prisma/client";

const encoder = new TextEncoder();

const accessSecret = () => {
  const s = process.env.JWT_ACCESS_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_ACCESS_SECRET missing or too short (min 32 chars)");
  return encoder.encode(s);
};

export interface AccessTokenPayload {
  sub: string; // user id
  role: Role;
  email: string;
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ role: payload.role, email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_ACCESS_TTL ?? "15m")
    .setIssuer("amity-arts")
    .sign(accessSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret(), { issuer: "amity-arts" });
    if (!payload.sub || !payload.role || !payload.email) return null;
    return { sub: payload.sub, role: payload.role as Role, email: payload.email as string };
  } catch {
    return null;
  }
}

// ── Refresh tokens: opaque random values, SHA-256 hashed at rest ──

export const generateOpaqueToken = () => randomBytes(48).toString("base64url");

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const refreshTtlMs = () =>
  Number(process.env.JWT_REFRESH_TTL_DAYS ?? 30) * 24 * 60 * 60 * 1000;

export const REFRESH_COOKIE = "amity_refresh";
