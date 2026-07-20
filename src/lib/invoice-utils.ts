/** Invoice helpers, pure and unit-tested. */

/** Indian fiscal year label: Apr 2026 - Mar 2027 → "2026-27". */
export function fiscalYear(date: Date): string {
  const y = date.getFullYear();
  const start = date.getMonth() >= 3 ? y : y - 1; // months are 0-indexed; Apr = 3
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export const formatInvoiceNumber = (fy: string, seq: number) =>
  `AA/${fy}/${String(seq).padStart(4, "0")}`;

/** Amount in words, Indian numbering (lakhs/crores), for invoice footers. */
const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", twoDigits(rest)].filter(Boolean).join(" ");
}

export function amountInWords(amount: number): string {
  if (amount < 0 || !Number.isFinite(amount)) return "";
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  if (rupees === 0 && paise === 0) return "Zero Rupees Only";

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const rest = rupees % 1000;

  const parts = [
    crore ? `${twoDigits(crore)} Crore` : "",
    lakh ? `${twoDigits(lakh)} Lakh` : "",
    thousand ? `${twoDigits(thousand)} Thousand` : "",
    rest ? threeDigits(rest) : "",
  ].filter(Boolean);

  const rupeeWords = parts.length ? `${parts.join(" ")} Rupees` : "";
  const paiseWords = paise ? `${twoDigits(paise)} Paise` : "";
  return [rupeeWords, paiseWords].filter(Boolean).join(" and ") + " Only";
}
