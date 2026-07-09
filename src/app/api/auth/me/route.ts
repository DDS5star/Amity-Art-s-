import type { NextRequest } from "next/server";
import { ok, handleApiError, notFound } from "@/lib/api";
import { requireAuth } from "@/server/middleware/auth";
import { prisma } from "@/server/db";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: {
        id: true, email: true, phone: true, firstName: true, lastName: true,
        role: true, emailVerifiedAt: true, loyaltyPoints: true, referralCode: true,
        createdAt: true,
        wholesalerProfile: {
          select: { companyName: true, status: true, gstin: true, creditLimit: true, creditDays: true, creditUsed: true },
        },
      },
    });
    if (!user) throw notFound("User");
    return ok(user);
  } catch (err) {
    return handleApiError(err);
  }
}
