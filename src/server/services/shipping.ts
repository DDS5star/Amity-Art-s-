import { prisma } from "@/server/db";
import { badRequest } from "@/lib/api";
import {
  estimateDelivery,
  pincodePrefix,
  PINCODE_REGEX,
  type DeliveryEstimate,
} from "@/lib/delivery-estimate";
import { getDefaultZoneName, getOutOfStockLeadDays } from "./settings";

/** Zone for a destination pincode; falls back to the configured default zone. */
export async function zoneForPincode(pincode: string) {
  if (!PINCODE_REGEX.test(pincode)) throw badRequest("Invalid pincode");

  const match = await prisma.pincodeZone.findUnique({
    where: { pincodePrefix: pincodePrefix(pincode) },
    include: { zone: true },
  });
  if (match && match.zone.isActive) return match.zone;

  const defaultZone = await prisma.shippingZone.findFirst({
    where: { name: await getDefaultZoneName(), isActive: true },
  });
  if (!defaultZone) throw badRequest("No shipping zone configured for this pincode");
  return defaultZone;
}

/**
 * ETA for a destination — BOTH channels use this (product page + checkout).
 * Stock check: variant if given, else product rollup.
 */
export async function estimateForPincode(params: {
  pincode: string;
  productId?: string;
  variantId?: string;
}): Promise<DeliveryEstimate & { shippingRate: number; freeAbove: number | null; codAvailable: boolean }> {
  const zone = await zoneForPincode(params.pincode);

  let inStock = true;
  if (params.variantId) {
    const v = await prisma.productVariant.findUnique({
      where: { id: params.variantId },
      select: { stockQty: true },
    });
    inStock = (v?.stockQty ?? 0) > 0;
  } else if (params.productId) {
    const p = await prisma.product.findUnique({
      where: { id: params.productId },
      select: { stockQty: true },
    });
    inStock = (p?.stockQty ?? 0) > 0;
  }

  const estimate = estimateDelivery({
    zone: { zoneName: zone.name, minDays: zone.minDays, maxDays: zone.maxDays },
    inStock,
    outOfStockLeadDays: await getOutOfStockLeadDays(),
  });

  return {
    ...estimate,
    shippingRate: Number(zone.baseRate),
    freeAbove: zone.freeAbove ? Number(zone.freeAbove) : null,
    codAvailable: zone.codAvailable,
  };
}
