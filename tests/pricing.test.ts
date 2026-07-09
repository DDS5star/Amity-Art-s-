import { describe, it, expect } from "vitest";
import {
  baseUnitPrice,
  applyProductDiscount,
  resolveTier,
  resolveUnitPrice,
  couponDiscount,
  validateWholesaleQty,
  type PricingProduct,
  type Tier,
} from "@/lib/pricing";

const product: PricingProduct = {
  retailPrice: 2499,
  wholesalePrice: 1450,
  discountType: null,
  discountValue: null,
};

describe("baseUnitPrice", () => {
  it("returns retail price for retail channel", () => {
    expect(baseUnitPrice("RETAIL", product)).toBe(2499);
  });

  it("returns wholesale price for wholesale channel", () => {
    expect(baseUnitPrice("WHOLESALE", product)).toBe(1450);
  });

  it("variant price overrides product price", () => {
    expect(baseUnitPrice("RETAIL", product, { retailPrice: 2299, wholesalePrice: null })).toBe(2299);
    expect(baseUnitPrice("WHOLESALE", product, { retailPrice: null, wholesalePrice: 1400 })).toBe(1400);
  });

  it("variant without wholesale price inherits product wholesale price", () => {
    expect(baseUnitPrice("WHOLESALE", product, { retailPrice: 2299, wholesalePrice: null })).toBe(1450);
  });

  it("throws when product has no wholesale price on wholesale channel", () => {
    expect(() => baseUnitPrice("WHOLESALE", { ...product, wholesalePrice: null })).toThrow(
      /not available for wholesale/,
    );
  });
});

describe("applyProductDiscount", () => {
  it("percent discount applies on retail only", () => {
    const discounted = { ...product, discountType: "PERCENT" as const, discountValue: 10 };
    expect(applyProductDiscount("RETAIL", 2499, discounted)).toBe(2249.1);
    expect(applyProductDiscount("WHOLESALE", 1450, discounted)).toBe(1450);
  });

  it("fixed discount cannot push price below zero", () => {
    const discounted = { ...product, discountType: "FIXED" as const, discountValue: 5000 };
    expect(applyProductDiscount("RETAIL", 2499, discounted)).toBe(0);
  });
});

describe("resolveTier", () => {
  const tiers: Tier[] = [
    { scope: "PRODUCT", minQty: 12, price: null, discountPercent: 0 },
    { scope: "PRODUCT", minQty: 48, price: null, discountPercent: 5 },
    { scope: "PRODUCT", minQty: 96, price: null, discountPercent: 10 },
  ];

  it("returns null below the lowest tier", () => {
    expect(resolveTier(tiers, 6)).toBeNull();
  });

  it("picks the highest qualifying tier", () => {
    expect(resolveTier(tiers, 50)?.minQty).toBe(48);
    expect(resolveTier(tiers, 500)?.minQty).toBe(96);
  });

  it("variant tiers shadow product tiers entirely", () => {
    const mixed: Tier[] = [
      ...tiers,
      { scope: "VARIANT", minQty: 24, price: 1300, discountPercent: null },
    ];
    // qty 100 qualifies product tier 96 AND variant tier 24 → variant wins
    expect(resolveTier(mixed, 100)?.scope).toBe("VARIANT");
  });
});

describe("resolveUnitPrice — full pipeline", () => {
  const tiers: Tier[] = [
    { scope: "PRODUCT", minQty: 48, price: null, discountPercent: 5 },
    { scope: "PRODUCT", minQty: 96, price: null, discountPercent: 10 },
  ];

  it("wholesale with tier: 96+ units → 10% off wholesale price", () => {
    expect(resolveUnitPrice({ channel: "WHOLESALE", product, tiers, quantity: 96 })).toBe(1305);
  });

  it("wholesale below tiers keeps base wholesale price", () => {
    expect(resolveUnitPrice({ channel: "WHOLESALE", product, tiers, quantity: 12 })).toBe(1450);
  });

  it("retail ignores wholesale tiers", () => {
    expect(resolveUnitPrice({ channel: "RETAIL", product, tiers, quantity: 96 })).toBe(2499);
  });

  it("fixed tier price wins over percent when tier defines price", () => {
    const priceTiers: Tier[] = [{ scope: "PRODUCT", minQty: 10, price: 1111, discountPercent: null }];
    expect(resolveUnitPrice({ channel: "WHOLESALE", product, tiers: priceTiers, quantity: 10 })).toBe(1111);
  });
});

describe("couponDiscount", () => {
  it("percent coupon with cap", () => {
    expect(
      couponDiscount(10000, { type: "PERCENT", value: 10, minOrderAmount: null, maxDiscountAmount: 500 }),
    ).toBe(500);
  });

  it("returns 0 under min order amount", () => {
    expect(
      couponDiscount(499, { type: "FIXED", value: 100, minOrderAmount: 500, maxDiscountAmount: null }),
    ).toBe(0);
  });

  it("never exceeds subtotal", () => {
    expect(
      couponDiscount(50, { type: "FIXED", value: 100, minOrderAmount: null, maxDiscountAmount: null }),
    ).toBe(50);
  });
});

describe("validateWholesaleQty — MOQ and pack size (size-matrix group sums)", () => {
  it("rejects below MOQ", () => {
    expect(validateWholesaleQty(6, 12, 4)).toEqual({ ok: false, reason: "Minimum order quantity is 12" });
  });

  it("rejects non-multiples of pack size", () => {
    const res = validateWholesaleQty(14, 12, 4);
    expect(res.ok).toBe(false);
  });

  it("accepts MOQ-satisfying pack multiples", () => {
    expect(validateWholesaleQty(16, 12, 4)).toEqual({ ok: true });
  });
});
