/** Server-rendered JSON-LD structured data (schema.org). */

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Serialized server-side from our own typed objects, never user HTML.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replaceAll("<", "\\u003c") }}
    />
  );
}

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const organizationLd = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Amity Arts",
  url: BASE,
  logo: `${BASE}/brand/logo.png`,
  sameAs: [],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: "hello@amityarts.in",
    areaServed: "IN",
    availableLanguage: ["en", "hi"],
  },
});

export const webSiteLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Amity Arts",
  url: BASE,
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${BASE}/jewellery?search={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
});

export const productLd = (p: {
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  sku: string;
  price: number;
  inStock: boolean;
  material: string | null;
  ratingAvg: number;
  ratingCount: number;
}) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name: p.name,
  url: `${BASE}/product/${p.slug}`,
  ...(p.image ? { image: [p.image] } : {}),
  ...(p.description ? { description: p.description } : {}),
  sku: p.sku,
  brand: { "@type": "Brand", name: "Amity Arts" },
  ...(p.material ? { material: p.material } : {}),
  offers: {
    "@type": "Offer",
    url: `${BASE}/product/${p.slug}`,
    priceCurrency: "INR",
    price: p.price,
    availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@type": "Organization", name: "Amity Arts" },
  },
  ...(p.ratingCount > 0
    ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: p.ratingAvg,
          reviewCount: p.ratingCount,
        },
      }
    : {}),
});

export const breadcrumbLd = (crumbs: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: c.name,
    item: `${BASE}${c.path}`,
  })),
});
