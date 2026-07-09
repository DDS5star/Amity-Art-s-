import { describe, it, expect } from "vitest";
import { splitGst, isValidGstin, stateCodeFromGstin } from "@/lib/gst";

describe("splitGst", () => {
  it("intra-state: CGST + SGST at half rate each", () => {
    // Maharashtra buyer (27), Maharashtra seller (27), 3% on ₹10,000
    const gst = splitGst(10000, 3, "27", "27");
    expect(gst).toEqual({ isInterState: false, cgst: 150, sgst: 150, igst: 0, total: 300 });
  });

  it("inter-state: IGST at full rate", () => {
    // Delhi buyer (07), Maharashtra seller (27)
    const gst = splitGst(10000, 3, "07", "27");
    expect(gst).toEqual({ isInterState: true, cgst: 0, sgst: 0, igst: 300, total: 300 });
  });

  it("odd paise totals still satisfy cgst + sgst === total", () => {
    const gst = splitGst(1234.55, 3, "27", "27");
    expect(gst.cgst + gst.sgst).toBeCloseTo(gst.total, 2);
  });

  it("zero amount yields zero tax", () => {
    expect(splitGst(0, 3, "27", "27").total).toBe(0);
  });

  it("rejects negative amounts and absurd rates", () => {
    expect(() => splitGst(-1, 3, "27", "27")).toThrow();
    expect(() => splitGst(100, 101, "27", "27")).toThrow();
  });
});

describe("GSTIN validation", () => {
  it("accepts a well-formed GSTIN", () => {
    expect(isValidGstin("27ABCDE1234F1Z5")).toBe(true);
  });

  it("rejects malformed GSTINs", () => {
    expect(isValidGstin("27abcde1234f1z5")).toBe(false);
    expect(isValidGstin("7ABCDE1234F1Z5")).toBe(false);
    expect(isValidGstin("")).toBe(false);
  });

  it("extracts the state code", () => {
    expect(stateCodeFromGstin("27ABCDE1234F1Z5")).toBe("27");
  });
});
