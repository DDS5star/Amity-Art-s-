import type { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api";
import { requirePermission } from "@/server/middleware/auth";
import { prisma } from "@/server/db";

/** Attributes + values, for the admin variant builder. */
export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "catalog.manage");
    const attributes = await prisma.attribute.findMany({
      orderBy: { sortOrder: "asc" },
      include: { values: { orderBy: { sortOrder: "asc" } } },
    });
    return ok(attributes);
  } catch (err) {
    return handleApiError(err);
  }
}
