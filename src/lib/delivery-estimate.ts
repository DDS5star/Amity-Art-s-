/**
 * Delivery ETA — applies to BOTH retail and wholesale channels.
 * warehouse pincode (SiteSetting) → customer pincode 3-digit prefix →
 * ShippingZone(minDays, maxDays); +leadDays when out of stock.
 * Pure calculation here; zone lookup lives in the shipping service.
 */

export interface ZoneDays {
  zoneName: string;
  minDays: number;
  maxDays: number;
}

export interface DeliveryEstimate {
  zoneName: string;
  minDays: number;
  maxDays: number;
  earliest: Date;
  latest: Date;
  outOfStock: boolean;
}

export const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

export const pincodePrefix = (pincode: string) => pincode.slice(0, 3);

export function estimateDelivery(params: {
  zone: ZoneDays;
  inStock: boolean;
  outOfStockLeadDays: number;
  from?: Date;
}): DeliveryEstimate {
  const { zone, inStock, outOfStockLeadDays, from = new Date() } = params;
  const lead = inStock ? 0 : outOfStockLeadDays;

  const addDays = (base: Date, days: number) => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
  };

  return {
    zoneName: zone.zoneName,
    minDays: zone.minDays + lead,
    maxDays: zone.maxDays + lead,
    earliest: addDays(from, zone.minDays + lead),
    latest: addDays(from, zone.maxDays + lead),
    outOfStock: !inStock,
  };
}
