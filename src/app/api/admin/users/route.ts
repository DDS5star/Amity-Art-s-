import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, handleApiError } from "@/lib/api";
import { listUsers } from "@/server/services/users";
import { requirePermission } from "@/server/middleware/auth";

const querySchema = z.object({
  role: z.enum(["SUPER_ADMIN", "MANAGER", "WHOLESALER", "CUSTOMER"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "users.manage");
    const query = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
    return ok(await listUsers(query));
  } catch (err) {
    return handleApiError(err);
  }
}
