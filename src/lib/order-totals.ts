import { round2 } from "./money";
import { splitGst, type GstBreakdown } from "./gst";

/**
 * Order money math, pure and unit-tested.
 *
 * GST convention (documented business rule):
 * - RETAIL prices are tax-INCLUSIVE (MRP style): GST is back-calculated out
 *   of the charged price for the invoice.
 * - WHOLESALE prices are tax-EXCLUSIVE (B2B convention): GST is added on top.
 */

export interface TotalsLine {
  unitPrice: number; // channel-correct, tier-applied
  quantity: number;
  taxRatePercent: number;
}

export interface LineTotals extends TotalsLine {
  taxableValue: number; // pre-tax line value
  taxAmount: number;
  lineTotal: number; // charged for this line (incl. tax)
}

export interface OrderTotals {
  lines: LineTotals[];
  subtotal: number; // taxable (pre-tax) sum
  gst: GstBreakdown;
  shippingAmount: number;
  totalAmount: number; // grand total charged
}

export function computeOrderTotals(params: {
  channel: "RETAIL" | "WHOLESALE";
  lines: TotalsLine[];
  customerStateCode: string;
  sellerStateCode: string;
  shipping: { baseRate: number; freeAbove: number | null };
}): OrderTotals {
  const { channel, lines, customerStateCode, sellerStateCode, shipping } = params;
  const inclusive = channel === "RETAIL";

  const computed: LineTotals[] = lines.map((l) => {
    const gross = round2(l.unitPrice * l.quantity);
    const rate = l.taxRatePercent;
    const taxableValue = inclusive ? round2(gross / (1 + rate / 100)) : gross;
    const taxAmount = round2(inclusive ? gross - taxableValue : (gross * rate) / 100);
    const lineTotal = inclusive ? gross : round2(gross + taxAmount);
    return { ...l, taxableValue, taxAmount, lineTotal };
  });

  const subtotal = round2(computed.reduce((s, l) => s + l.taxableValue, 0));
  const taxTotal = round2(computed.reduce((s, l) => s + l.taxAmount, 0));
  const goodsTotal = round2(computed.reduce((s, l) => s + l.lineTotal, 0));

  // Weighted GST split across the whole order (single rate in practice today,
  // but the split holds even with mixed rates because it uses the summed tax).
  const gstSplit = splitGst(subtotal, 0, customerStateCode, sellerStateCode);
  const isInterState = gstSplit.isInterState;
  const half = round2(taxTotal / 2);
  const gst: GstBreakdown = isInterState
    ? { isInterState, cgst: 0, sgst: 0, igst: taxTotal, total: taxTotal }
    : { isInterState, cgst: half, sgst: round2(taxTotal - half), igst: 0, total: taxTotal };

  // Free shipping threshold applies to the goods total actually charged.
  const shippingAmount =
    shipping.freeAbove != null && goodsTotal >= shipping.freeAbove ? 0 : round2(shipping.baseRate);

  return {
    lines: computed,
    subtotal,
    gst,
    shippingAmount,
    totalAmount: round2(goodsTotal + shippingAmount),
  };
}

/** Readable order number: AA-R-2026-00042 / AA-W-2026-00007. */
export const formatOrderNumber = (channel: "RETAIL" | "WHOLESALE", year: number, seq: number) =>
  `AA-${channel === "RETAIL" ? "R" : "W"}-${year}-${String(seq).padStart(5, "0")}`;
