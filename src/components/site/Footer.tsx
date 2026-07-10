import Link from "next/link";

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
    <footer className="border-t border-forest-800 bg-forest-900">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-5">
          <p className="font-display text-3xl text-bone-50">Amity Art&apos;s</p>
          <p className="mt-3 text-sm text-bone-500 max-w-[38ch] leading-relaxed">
            Handcrafted kundan, polki and pearl jewellery from Mumbai. Retail and
            approved wholesale.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.heading} className="md:col-span-2">
            <p className="text-sm font-semibold text-bone-100 mb-4">{col.heading}</p>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-bone-500 hover:text-bone-100 transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-forest-800">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-bone-600">
          <p>© {new Date().getFullYear()} Amity Art&apos;s. All rights reserved.</p>
          <p>GST invoices on every order. Made in Mumbai.</p>
        </div>
      </div>
    </footer>
  );
}
