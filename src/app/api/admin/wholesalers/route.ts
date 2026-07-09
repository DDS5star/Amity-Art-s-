import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, handleApiError } from "@/lib/api";
import { listWholesalers } from "@/server/services/users";
import { requirePermission } from "@/server/middleware/auth";

const querySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "SUSPENDED", "REJECTED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "wholesalers.approve");
    const query = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
    return ok(await listWholesalers(query));
  } catch (err) {
    return handleApiError(err);
  }
}
