import { round2 } from "./money";

/**
 * Channel-aware price resolution, pure and unit-testable.
 *
 * Resolution order:
 *  1. Base: variant price (if set) else product price, for the channel.
 *  2. Product-level discount (retail only — wholesale prices are already net).
 *  3. Quantity tier (wholesale): variant tier beats product tier; the highest
 *     qualifying minQty wins. For size-matrix rows, `quantity` must be the
 *     SUM across the matrixKey group (caller's responsibility).
 */

export type Channel = "RETAIL" | "WHOLESALE";

export interface PricingProduct {
  retailPrice: number;
  wholesalePrice: number | null;
  discountType: "PERCENT" | "FIXED" | null;
  discountValue: number | null;
}

export interface PricingVariant {
  retailPrice: number | null; // null = inherit product
  wholesalePrice: number | null;
}

export interface Tier {
  scope: "PRODUCT" | "VARIANT";
  minQty: number;
  price: number | null; // XOR discountPercent
  discountPercent: number | null;
}

export function baseUnitPrice(
  channel: Channel,
  product: PricingProduct,
  variant?: PricingVariant | null,
): number {
  if (channel === "WHOLESALE") {
    const price = variant?.wholesalePrice ?? product.wholesalePrice;
    if (price == null) {
      throw new Error("Product is not available for wholesale");
    }
    return price;
  }
  return variant?.retailPrice ?? product.retailPrice;
}

/** Product-level promotional discount — applies to RETAIL only. */
export function applyProductDiscount(channel: Channel, unitPrice: number, product: PricingProduct): number {
  if (channel !== "RETAIL" || !product.discountType || product.discountValue == null) {
    return unitPrice;
  }
  const discounted =
    product.discountType === "PERCENT"
      ? unitPrice * (1 - product.discountValue / 100)
      : unitPrice - product.discountValue;
  return round2(Math.max(0, discounted));
}

/** Pick the winning tier: variant tiers shadow product tiers entirely if any qualify. */
export function resolveTier(tiers: Tier[], quantity: number): Tier | null {
  const qualifying = tiers.filter((t) => quantity >= t.minQty);
  if (qualifying.length === 0) return null;
  const variantTiers = qualifying.filter((t) => t.scope === "VARIANT");
  const pool = variantTiers.length > 0 ? variantTiers : qualifying;
  return pool.reduce((best, t) => (t.minQty > best.minQty ? t : best));
}

export function applyTier(unitPrice: number, tier: Tier | null): number {
  if (!tier) return unitPrice;
  if (tier.price != null) return round2(tier.price);
  if (tier.discountPercent != null) {
    return round2(unitPrice * (1 - tier.discountPercent / 100));
  }
  return unitPrice;
}

/** Full unit-price pipeline. `quantity` = matrixKey-group sum for wholesale matrices. */
export function resolveUnitPrice(params: {
  channel: Channel;
  product: PricingProduct;
  variant?: PricingVariant | null;
  tiers?: Tier[];
  quantity?: number;
}): number {
  const { channel, product, variant, tiers = [], quantity = 1 } = params;
  let price = baseUnitPrice(channel, product, variant);
  price = applyProductDiscount(channel, price, product);
  if (channel === "WHOLESALE") {
    price = applyTier(price, resolveTier(tiers, quantity));
  }
  return round2(price);
}

// ── Coupons ──

export interface CouponRules {
  type: "PERCENT" | "FIXED";
  value: number;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
}

/** Discount a coupon yields on a pre-tax subtotal (0 if not applicable). */
export function couponDiscount(subtotal: number, coupon: CouponRules): number {
  if (coupon.minOrderAmount != null && subtotal < coupon.minOrderAmount) return 0;
  let discount = coupon.type === "PERCENT" ? (subtotal * coupon.value) / 100 : coupon.value;
  if (coupon.maxDiscountAmount != null) discount = Math.min(discount, coupon.maxDiscountAmount);
  return round2(Math.min(discount, subtotal));
}

// ── Wholesale order rules ──

/** Validate MOQ / pack-size for a wholesale line (quantity = matrix-group sum). */
export function validateWholesaleQty(quantity: number, moq: number, packSize: number):
  | { ok: true }
  | { ok: false; reason: string } {
  if (quantity < moq) {
    return { ok: false, reason: `Minimum order quantity is ${moq}` };
  }
  if (packSize > 1 && quantity % packSize !== 0) {
    return { ok: false, reason: `Quantity must be a multiple of pack size ${packSize}` };
  }
  return { ok: true };
}
