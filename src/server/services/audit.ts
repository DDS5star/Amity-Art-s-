import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";

/** Append an audit row. Best-effort: audit failure never breaks the mutation. */
export async function audit(params: {
  actorId: string | null;
  action: string; // "product.update"
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        before: (params.before ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        after: (params.after ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        ip: params.ip ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write audit log:", err);
  }
}
