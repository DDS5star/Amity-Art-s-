import type { NextRequest } from "next/server";
import { created, handleApiError } from "@/lib/api";
import { createCategorySchema } from "@/lib/validation/catalog";
import { createCategory } from "@/server/services/catalog";
import { requirePermission } from "@/server/middleware/auth";
import { audit } from "@/server/services/audit";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission(req, "catalog.manage");
    const input = createCategorySchema.parse(await req.json());
    const category = await createCategory(input);
    await audit({
      actorId: ctx.userId,
      action: "category.create",
      entityType: "Category",
      entityId: category.id,
      after: { name: category.name, path: category.path },
    });
    return created(category);
  } catch (err) {
    return handleApiError(err);
  }
}
