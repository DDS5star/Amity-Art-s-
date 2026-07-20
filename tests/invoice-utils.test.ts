import { describe, it, expect } from "vitest";
import { fiscalYear, formatInvoiceNumber, amountInWords } from "@/lib/invoice-utils";

describe("fiscalYear (Indian FY, Apr-Mar)", () => {
  it("July 2026 falls in FY 2026-27", () => {
    expect(fiscalYear(new Date("2026-07-17"))).toBe("2026-27");
  });
  it("February 2027 still falls in FY 2026-27", () => {
    expect(fiscalYear(new Date("2027-02-10"))).toBe("2026-27");
  });
  it("April 1st starts the new FY", () => {
    expect(fiscalYear(new Date("2027-04-01"))).toBe("2027-28");
  });
  it("handles century wrap in the short year", () => {
    expect(fiscalYear(new Date("2099-05-01"))).toBe("2099-00");
  });
});

describe("formatInvoiceNumber", () => {
  it("pads the sequence", () => {
    expect(formatInvoiceNumber("2026-27", 7)).toBe("AA/2026-27/0007");
  });
});

describe("amountInWords (Indian numbering)", () => {
  it("simple amounts", () => {
    expect(amountInWords(1379)).toBe("One Thousand Three Hundred Seventy Nine Rupees Only");
  });
  it("lakhs and paise", () => {
    expect(amountInWords(129038.4)).toBe(
      "One Lakh Twenty Nine Thousand Thirty Eight Rupees and Forty Paise Only",
    );
  });
  it("crores", () => {
    expect(amountInWords(23456789)).toBe(
      "Two Crore Thirty Four Lakh Fifty Six Thousand Seven Hundred Eighty Nine Rupees Only",
    );
  });
  it("zero", () => {
    expect(amountInWords(0)).toBe("Zero Rupees Only");
  });
});
