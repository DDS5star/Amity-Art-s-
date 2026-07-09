import type { NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { verifyAccessToken, type AccessTokenPayload } from "@/lib/tokens";
import { prisma } from "@/server/db";
import { unauthorized, forbidden } from "@/lib/api";

export interface AuthContext {
  userId: string;
  role: Role;
  email: string;
}

/** Extract + verify the Bearer access token. Throws ApiError(401) when absent/invalid. */
export async function requireAuth(req: NextRequest): Promise<AuthContext> {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw unauthorized();

  const payload: AccessTokenPayload | null = await verifyAccessToken(token);
  if (!payload) throw unauthorized("Invalid or expired token");

  return { userId: payload.sub, role: payload.role, email: payload.email };
}

/**
 * RBAC permission matrix (spec: Manager cannot touch payments/settings/admin
 * management; wholesaler-only surfaces additionally need APPROVED status).
 */
const PERMISSIONS = {
  "catalog.manage": ["SUPER_ADMIN", "MANAGER"],
  "orders.view": ["SUPER_ADMIN", "MANAGER"],
  "orders.process": ["SUPER_ADMIN", "MANAGER"],
  "orders.edit": ["SUPER_ADMIN"],
  "inventory.manage": ["SUPER_ADMIN", "MANAGER"],
  "users.manage": ["SUPER_ADMIN"],
  "wholesalers.approve": ["SUPER_ADMIN"],
  "settings.manage": ["SUPER_ADMIN"],
  "payments.manage": ["SUPER_ADMIN"],
  "cms.manage": ["SUPER_ADMIN", "MANAGER"],
  "analytics.view": ["SUPER_ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

/** requireAuth + permission check. */
export async function requirePermission(req: NextRequest, permission: Permission): Promise<AuthContext> {
  const ctx = await requireAuth(req);
  if (!hasPermission(ctx.role, permission)) throw forbidden();
  return ctx;
}

/** Wholesaler surfaces: role WHOLESALER *and* profile APPROVED, or staff. */
export async function requireApprovedWholesaler(req: NextRequest): Promise<AuthContext> {
  const ctx = await requireAuth(req);
  if (ctx.role === "SUPER_ADMIN" || ctx.role === "MANAGER") return ctx;
  if (ctx.role !== "WHOLESALER") throw forbidden("Wholesale account required");

  const profile = await prisma.wholesalerProfile.findUnique({
    where: { userId: ctx.userId },
    select: { status: true },
  });
  if (profile?.status !== "APPROVED") {
    throw forbidden("Your wholesale account is pending approval");
  }
  return ctx;
}
