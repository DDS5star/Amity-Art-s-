import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { ok, handleApiError } from "@/lib/api";
import { updateSettingSchema } from "@/lib/validation/settings";
import { getSettings, setSetting } from "@/server/services/settings";
import { requirePermission } from "@/server/middleware/auth";
import { audit } from "@/server/services/audit";

/** SUPER_ADMIN only (spec: Manager cannot manage settings). */
export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "settings.manage");
    const group = req.nextUrl.searchParams.get("group") ?? undefined;
    return ok(await getSettings(group));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await requirePermission(req, "settings.manage");
    const input = updateSettingSchema.parse(await req.json());
    const setting = await setSetting(
      input.key,
      input.value as Prisma.InputJsonValue,
      input.group,
      ctx.userId,
    );
    await audit({
      actorId: ctx.userId,
      action: "setting.update",
      entityType: "SiteSetting",
      entityId: input.key,
      after: { value: input.value },
    });
    return ok(setting);
  } catch (err) {
    return handleApiError(err);
  }
}
