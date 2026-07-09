import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/server/db";
import { ApiError, badRequest, conflict, unauthorized } from "@/lib/api";
import {
  signAccessToken,
  generateOpaqueToken,
  hashToken,
  refreshTtlMs,
} from "@/lib/tokens";
import type { RegisterInput, WholesalerApplyInput, LoginInput } from "@/lib/validation/auth";

const BCRYPT_COST = 12;

const newReferralCode = () => `AMITY-${randomBytes(4).toString("hex").toUpperCase()}`;

export interface SessionMeta {
  userAgent?: string | null;
  ip?: string | null;
}

export interface AuthResult {
  user: { id: string; email: string; firstName: string; lastName: string | null; role: string };
  accessToken: string;
  refreshToken: string; // raw — set as httpOnly cookie by the route
  refreshExpiresAt: Date;
}

async function issueTokens(
  user: { id: string; email: string; role: "SUPER_ADMIN" | "MANAGER" | "WHOLESALER" | "CUSTOMER"; firstName: string; lastName: string | null },
  meta: SessionMeta,
): Promise<AuthResult> {
  const accessToken = await signAccessToken({ sub: user.id, role: user.role, email: user.email });
  const refreshToken = generateOpaqueToken();
  const refreshExpiresAt = new Date(Date.now() + refreshTtlMs());

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      userAgent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
      expiresAt: refreshExpiresAt,
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    accessToken,
    refreshToken,
    refreshExpiresAt,
  };
}

export async function registerCustomer(input: RegisterInput, meta: SessionMeta): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict("An account with this email already exists");

  let referredById: string | null = null;
  if (input.referralCode) {
    const referrer = await prisma.user.findUnique({ where: { referralCode: input.referralCode } });
    if (!referrer) throw badRequest("Invalid referral code");
    referredById = referrer.id;
  }

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, BCRYPT_COST),
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      role: "CUSTOMER",
      referralCode: newReferralCode(),
      referredById,
    },
  });

  return issueTokens(user, meta);
}

/** Wholesaler registration → account exists but PENDING until admin approval. */
export async function applyAsWholesaler(input: WholesalerApplyInput, meta: SessionMeta): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict("An account with this email already exists");
  if (input.gstin) {
    const gstinTaken = await prisma.wholesalerProfile.findUnique({ where: { gstin: input.gstin } });
    if (gstinTaken) throw conflict("This GSTIN is already registered");
  }

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email: input.email,
        passwordHash: await bcrypt.hash(input.password, BCRYPT_COST),
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        role: "WHOLESALER",
        referralCode: newReferralCode(),
      },
    });
    await tx.wholesalerProfile.create({
      data: {
        userId: u.id,
        companyName: input.companyName,
        gstin: input.gstin,
        panNumber: input.panNumber,
        businessAddress: input.businessAddress,
        status: "PENDING",
      },
    });
    return u;
  });

  return issueTokens(user, meta);
}

export async function login(input: LoginInput, meta: SessionMeta): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Constant-shape: hash compare even for missing users to blunt timing probes.
  const hash = user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva";
  const valid = await bcrypt.compare(input.password, hash);

  if (!user || !valid) throw unauthorized("Invalid email or password");
  if (!user.isActive || user.deletedAt) {
    throw new ApiError(403, "ACCOUNT_SUSPENDED", "Your account has been suspended");
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return issueTokens(user, meta);
}

/**
 * Rotate a refresh token. Reuse detection: presenting a revoked/replaced token
 * revokes the user's entire session chain (stolen-token defence).
 */
export async function rotateRefreshToken(rawToken: string, meta: SessionMeta): Promise<AuthResult> {
  const row = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true },
  });

  if (!row) throw unauthorized("Invalid refresh token");

  if (row.revokedAt) {
    // Token reuse — kill every active session for this user.
    await prisma.refreshToken.updateMany({
      where: { userId: row.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw unauthorized("Session revoked due to suspected token reuse — please log in again");
  }
  if (row.expiresAt < new Date()) throw unauthorized("Refresh token expired");
  if (!row.user.isActive || row.user.deletedAt) {
    throw new ApiError(403, "ACCOUNT_SUSPENDED", "Your account has been suspended");
  }

  const result = await issueTokens(row.user, meta);
  await prisma.refreshToken.update({
    where: { id: row.id },
    data: {
      revokedAt: new Date(),
      replacedByTokenId: hashToken(result.refreshToken).slice(0, 24),
    },
  });
  return result;
}

export async function logout(rawToken: string | null): Promise<void> {
  if (!rawToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
