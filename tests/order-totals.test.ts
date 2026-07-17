import { describe, it, expect } from "vitest";
import { computeOrderTotals, formatOrderNumber } from "@/lib/order-totals";

const shipping = { baseRate: 100, freeAbove: 1499 };

describe("computeOrderTotals — RETAIL (tax-inclusive MRP)", () => {
  it("back-calculates GST out of the charged price", () => {
    // ₹2,499 incl. 3% GST → taxable 2426.21, tax 72.79
    const t = computeOrderTotals({
      channel: "RETAIL",
      lines: [{ unitPrice: 2499, quantity: 1, taxRatePercent: 3 }],
      customerStateCode: "27",
      sellerStateCode: "27",
      shipping,
    });
    expect(t.lines[0].taxableValue).toBeCloseTo(2426.21, 2);
    expect(t.lines[0].taxAmount).toBeCloseTo(72.79, 2);
    expect(t.lines[0].lineTotal).toBe(2499); // customer pays the sticker price
    expect(t.gst.cgst + t.gst.sgst).toBeCloseTo(72.79, 2);
    expect(t.shippingAmount).toBe(0); // 2499 >= 1499 free threshold
    expect(t.totalAmount).toBe(2499);
  });

  it("charges shipping below the free threshold", () => {
    const t = computeOrderTotals({
      channel: "RETAIL",
      lines: [{ unitPrice: 749, quantity: 1, taxRatePercent: 3 }],
      customerStateCode: "07",
      sellerStateCode: "27",
      shipping,
    });
    expect(t.shippingAmount).toBe(100);
    expect(t.totalAmount).toBe(849);
    expect(t.gst.igst).toBeGreaterThan(0); // inter-state
    expect(t.gst.cgst).toBe(0);
  });
});

describe("computeOrderTotals — WHOLESALE (tax-exclusive B2B)", () => {
  it("adds GST on top of the wholesale price", () => {
    // 48 × ₹1,377.50 = 66,120 + 3% GST = 68,103.60
    const t = computeOrderTotals({
      channel: "WHOLESALE",
      lines: [{ unitPrice: 1377.5, quantity: 48, taxRatePercent: 3 }],
      customerStateCode: "27",
      sellerStateCode: "27",
      shipping,
    });
    expect(t.subtotal).toBe(66120);
    expect(t.gst.total).toBeCloseTo(1983.6, 2);
    expect(t.gst.cgst).toBeCloseTo(991.8, 2);
    expect(t.totalAmount).toBeCloseTo(68103.6, 2);
  });

  it("splits IGST for inter-state B2B", () => {
    const t = computeOrderTotals({
      channel: "WHOLESALE",
      lines: [{ unitPrice: 520, quantity: 24, taxRatePercent: 3 }],
      customerStateCode: "24", // Gujarat buyer
      sellerStateCode: "27",
      shipping,
    });
    expect(t.gst.isInterState).toBe(true);
    expect(t.gst.igst).toBeCloseTo(374.4, 2);
    expect(t.gst.cgst).toBe(0);
  });
});

describe("formatOrderNumber", () => {
  it("formats channel-prefixed padded numbers", () => {
    expect(formatOrderNumber("RETAIL", 2026, 42)).toBe("AA-R-2026-00042");
    expect(formatOrderNumber("WHOLESALE", 2026, 7)).toBe("AA-W-2026-00007");
  });
});
