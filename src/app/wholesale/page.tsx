import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";

export const metadata: Metadata = {
  title: "Wholesale",
  description:
    "Buy Amity Art's jewellery in bulk: wholesale pricing, quantity discounts, GST invoices and credit terms for approved partners.",
};

const POINTS: { title: string; body: string }[] = [
  {
    title: "Wholesale pricing with quantity breaks",
    body: "Partner rates on every piece, with automatic discounts at 48 and 96 units.",
  },
  {
    title: "Order by size grid",
    body: "A spreadsheet-style order screen: one row per design, a quantity box per size.",
  },
  {
    title: "GST invoices and credit terms",
    body: "Proper GST invoices on every order. Approved partners can pay later on agreed credit days.",
  },
];

export default function WholesalePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24">
      <div className="max-w-2xl">
        <Reveal>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.1] text-bone-50">
            Stock Amity Art&apos;s in your store.
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 text-bone-300 leading-relaxed max-w-[48ch]">
            We supply boutiques and resellers across India. Apply with your GSTIN;
            most accounts are approved within 48 hours.
          </p>
        </Reveal>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-px bg-forest-800 rounded-xl overflow-hidden">
        {POINTS.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.08} className="bg-forest-900 p-8">
            <h2 className="font-display text-xl text-bone-50">{p.title}</h2>
            <p className="mt-3 text-sm text-bone-500 leading-relaxed">{p.body}</p>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.15} className="mt-14">
        <div className="flex flex-wrap items-center gap-5">
          <a
            href="mailto:wholesale@amityarts.in?subject=Wholesale%20application"
            className="px-7 py-3.5 rounded-full bg-amber-accent text-forest-950 text-sm font-semibold hover:bg-amber-soft transition-colors active:scale-[0.98]"
          >
            Apply for a wholesale account
          </a>
          <p className="text-sm text-bone-600">
            Already approved?{" "}
            <Link href="/jewellery" className="text-amber-soft underline underline-offset-4">
              Log in to see your pricing
            </Link>
            . The full ordering portal is coming shortly.
          </p>
        </div>
      </Reveal>
    </div>
  );
}
