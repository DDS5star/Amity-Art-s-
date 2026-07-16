import Link from "next/link";
import { Logo } from "./Logo";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Shop",
    links: [
      { label: "All jewellery", href: "/jewellery" },
      { label: "Bridal", href: "/jewellery?categorySlug=bridal-collection" },
      { label: "New arrivals", href: "/jewellery?newArrival=true" },
      { label: "Best sellers", href: "/jewellery?bestSeller=true" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Our story", href: "/#story" },
      { label: "Wholesale", href: "/wholesale" },
      { label: "Contact", href: "mailto:hello@amityarts.in" },
    ],
  },
  {
    heading: "Care",
    links: [
      { label: "Shipping", href: "/jewellery" },
      { label: "Returns", href: "/jewellery" },
      { label: "Jewellery care", href: "/jewellery" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-ivory-200 bg-ivory-100">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-5">
          <Logo />
          <p className="mt-4 text-sm text-ink-500 max-w-[38ch] leading-relaxed">
            Handcrafted kundan, polki and pearl jewellery from India. Retail and
            approved wholesale.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.heading} className="md:col-span-2">
            <p className="text-sm font-semibold text-ink-950 mb-4">{col.heading}</p>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-ink-500 hover:text-gold-700 transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-ivory-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-ink-400">
          <p>© {new Date().getFullYear()} Amity Arts® India. All rights reserved.</p>
          <p>GST invoices on every order. Handcrafted in India.</p>
        </div>
      </div>
    </footer>
  );
}
