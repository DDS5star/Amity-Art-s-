import { describe, it, expect } from "vitest";
import { estimateDelivery, pincodePrefix, PINCODE_REGEX } from "@/lib/delivery-estimate";

const zone = { zoneName: "Metro", minDays: 3, maxDays: 5 };

describe("estimateDelivery", () => {
  const from = new Date("2026-07-10T00:00:00Z");

  it("in-stock: zone days as-is", () => {
    const est = estimateDelivery({ zone, inStock: true, outOfStockLeadDays: 7, from });
    expect(est.minDays).toBe(3);
    expect(est.maxDays).toBe(5);
    expect(est.outOfStock).toBe(false);
    expect(est.earliest.toISOString().slice(0, 10)).toBe("2026-07-13");
    expect(est.latest.toISOString().slice(0, 10)).toBe("2026-07-15");
  });

  it("out-of-stock adds lead days to both bounds", () => {
    const est = estimateDelivery({ zone, inStock: false, outOfStockLeadDays: 7, from });
    expect(est.minDays).toBe(10);
    expect(est.maxDays).toBe(12);
    expect(est.outOfStock).toBe(true);
  });
});

describe("pincode helpers", () => {
  it("prefix is the first three digits", () => {
    expect(pincodePrefix("400064")).toBe("400");
    expect(pincodePrefix("110001")).toBe("110");
  });

  it("regex accepts valid Indian pincodes and rejects junk", () => {
    expect(PINCODE_REGEX.test("400064")).toBe(true);
    expect(PINCODE_REGEX.test("040064")).toBe(false); // cannot start with 0
    expect(PINCODE_REGEX.test("4000")).toBe(false);
    expect(PINCODE_REGEX.test("40006a")).toBe(false);
  });
});
