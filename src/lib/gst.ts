import { round2 } from "./money";

/**
 * GST split for a taxable amount.
 * Intra-state (place of supply == seller state): CGST + SGST, half rate each.
 * Inter-state: IGST at full rate.
 * Amounts are tax-exclusive (tax added on top), per Indian B2B convention.
 */
export interface GstBreakdown {
  isInterState: boolean;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export function splitGst(
  taxableAmount: number,
  ratePercent: number,
  customerStateCode: string,
  sellerStateCode: string,
): GstBreakdown {
  if (taxableAmount < 0) throw new Error("taxableAmount must be >= 0");
  if (ratePercent < 0 || ratePercent > 100) throw new Error("invalid GST rate");

  const isInterState = customerStateCode !== sellerStateCode;
  const total = round2((taxableAmount * ratePercent) / 100);

  if (isInterState) {
    return { isInterState, cgst: 0, sgst: 0, igst: total, total };
  }
  const half = round2(total / 2);
  // Keep cgst+sgst === total even when total is an odd paise amount.
  return { isInterState, cgst: half, sgst: round2(total - half), igst: 0, total };
}

/** GSTIN checksum-light validation (format only; full checksum in admin UI later). */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const isValidGstin = (gstin: string) => GSTIN_REGEX.test(gstin);

/** First two digits of a GSTIN are the state code. */
export const stateCodeFromGstin = (gstin: string) => gstin.slice(0, 2);
