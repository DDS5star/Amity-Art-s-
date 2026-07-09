import { prisma } from "@/server/db";
import { badRequest, notFound } from "@/lib/api";
import type { WholesalerReviewInput, UpdateUserStatusInput } from "@/lib/validation/auth";

// ── Admin: user management (SUPER_ADMIN only, enforced at the route) ──

export async function listUsers(params: { role?: string; page: number; limit: number }) {
  const where = {
    deletedAt: null,
    ...(params.role ? { role: params.role as never } : {}),
  };
  const [total, items] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      select: {
        id: true, email: true, phone: true, firstName: true, lastName: true,
        role: true, isActive: true, emailVerifiedAt: true, lastLoginAt: true,
        createdAt: true,
        wholesalerProfile: { select: { companyName: true, status: true, gstin: true } },
      },
    }),
  ]);
  return { items, pagination: { page: params.page, limit: params.limit, total } };
}

export async function updateUserStatus(userId: string, input: UpdateUserStatusInput, actorId: string) {
  if (userId === actorId) throw badRequest("You cannot change your own account status");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) throw notFound("User");
  if (user.role === "SUPER_ADMIN") throw badRequest("Super admin accounts cannot be modified");

  switch (input.action) {
    case "SUSPEND": {
      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.user.update({ where: { id: userId }, data: { isActive: false } });
        // Kill active sessions immediately.
        await tx.refreshToken.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return u;
      });
      return updated;
    }
    case "ACTIVATE":
      return prisma.user.update({ where: { id: userId }, data: { isActive: true } });
    case "PROMOTE_MANAGER":
      if (user.role !== "CUSTOMER") throw badRequest("Only customers can be promoted to manager");
      return prisma.user.update({ where: { id: userId }, data: { role: "MANAGER" } });
    case "DEMOTE_MANAGER":
      if (user.role !== "MANAGER") throw badRequest("User is not a manager");
      return prisma.user.update({ where: { id: userId }, data: { role: "CUSTOMER" } });
  }
}

// ── Admin: wholesaler approval workflow ──

export async function listWholesalers(params: { status?: string; page: number; limit: number }) {
  const where = params.status ? { status: params.status as never } : {};
  const [total, items] = await prisma.$transaction([
    prisma.wholesalerProfile.count({ where }),
    prisma.wholesalerProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      include: {
        user: { select: { id: true, email: true, phone: true, firstName: true, lastName: true, isActive: true } },
      },
    }),
  ]);
  return { items, pagination: { page: params.page, limit: params.limit, total } };
}

export async function reviewWholesaler(profileId: string, input: WholesalerReviewInput, actorId: string) {
  const profile = await prisma.wholesalerProfile.findUnique({ where: { id: profileId } });
  if (!profile) throw notFound("Wholesaler application");

  switch (input.action) {
    case "APPROVE":
      if (profile.status === "APPROVED") throw badRequest("Already approved");
      return prisma.wholesalerProfile.update({
        where: { id: profileId },
        data: {
          status: "APPROVED",
          approvedById: actorId,
          approvedAt: new Date(),
          rejectionReason: null,
          ...(input.creditLimit != null ? { creditLimit: input.creditLimit } : {}),
          ...(input.creditDays != null ? { creditDays: input.creditDays } : {}),
        },
      });
    case "REJECT":
      return prisma.wholesalerProfile.update({
        where: { id: profileId },
        data: { status: "REJECTED", rejectionReason: input.rejectionReason ?? "Not specified" },
      });
    case "SUSPEND":
      return prisma.wholesalerProfile.update({
        where: { id: profileId },
        data: { status: "SUSPENDED", rejectionReason: input.rejectionReason },
      });
    case "REACTIVATE":
      if (profile.status !== "SUSPENDED") throw badRequest("Only suspended accounts can be reactivated");
      return prisma.wholesalerProfile.update({
        where: { id: profileId },
        data: { status: "APPROVED", rejectionReason: null },
      });
  }
}
