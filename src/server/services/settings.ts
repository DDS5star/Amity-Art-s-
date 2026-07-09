import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";

/** Typed accessors over the SiteSetting key-value store. */

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  return row ? (row.value as T) : fallback;
}

export async function getSettings(group?: string) {
  return prisma.siteSetting.findMany({
    where: group ? { group } : undefined,
    orderBy: [{ group: "asc" }, { key: "asc" }],
  });
}

export async function setSetting(
  key: string,
  value: Prisma.InputJsonValue,
  group: string,
  actorId: string,
) {
  return prisma.siteSetting.upsert({
    where: { key },
    update: { value, group, updatedById: actorId },
    create: { key, value, group, updatedById: actorId },
  });
}

// Frequently used, strongly typed settings:
export const getWarehousePincode = () => getSetting("warehouse.pincode", "400064");
export const getWarehouseStateCode = () => getSetting("warehouse.stateCode", "27");
export const getOutOfStockLeadDays = () => getSetting("shipping.outOfStockLeadDays", 7);
export const getDefaultZoneName = () => getSetting("shipping.defaultZoneName", "Rest of India");
export const getSellerGstin = () => getSetting("gst.sellerGstin", "");
