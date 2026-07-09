import type { NextRequest } from "next/server";
import { created, handleApiError } from "@/lib/api";
import { createProductSchema } from "@/lib/validation/catalog";
import { createProduct } from "@/server/services/catalog";
import { requirePermission } from "@/server/middleware/auth";
import { audit } from "@/server/services/audit";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission(req, "catalog.manage");
    const input = createProductSchema.parse(await req.json());
    const product = await createProduct(input);
    await audit({
      actorId: ctx.userId,
      action: "product.create",
      entityType: "Product",
      entityId: product.id,
      after: { name: product.name, sku: product.sku },
    });
    return created(product);
  } catch (err) {
    return handleApiError(err);
  }
}
