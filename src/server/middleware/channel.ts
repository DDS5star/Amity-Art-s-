import type { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { verifyAccessToken } from "@/lib/tokens";
import type { Channel } from "@/lib/pricing";

/**
 * Channel resolution for public catalog routes:
 * an APPROVED wholesaler (or staff previewing with ?channel=wholesale)
 * sees WHOLESALE pricing; everyone else sees RETAIL. Anonymous = RETAIL.
 */
export async function resolveChannel(req: NextRequest): Promise<Channel> {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return "RETAIL";

  const payload = await verifyAccessToken(token);
  if (!payload) return "RETAIL";

  if (payload.role === "WHOLESALER") {
    const profile = await prisma.wholesalerProfile.findUnique({
      where: { userId: payload.sub },
      select: { status: true },
    });
    return profile?.status === "APPROVED" ? "WHOLESALE" : "RETAIL";
  }

  // Staff can preview wholesale pricing explicitly.
  if (
    (payload.role === "SUPER_ADMIN" || payload.role === "MANAGER") &&
    req.nextUrl.searchParams.get("channel") === "wholesale"
  ) {
    return "WHOLESALE";
  }

  return "RETAIL";
}
