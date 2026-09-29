import type { Metadata } from "next";
import Link from "next/link";
import { listProducts, getCategoryTree } from "@/server/services/catalog";
import { listProductsQuerySchema } from "@/lib/validation/catalog";
import { ProductCard } from "@/components/product/ProductCard";
import { Reveal } from "@/components/site/Reveal";

export const metadata: Metadata = {
  title: "Jewellery",
  description: "All handcrafted jewellery: necklaces, earrings, bangles, rings and bridal sets.",
};

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "popular", label: "Popular" },
] as const;

type Search = Record<string, string | string[] | undefined>;

const qs = (params: Record<string, string | undefined>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export default async function JewelleryPage({ searchParams }: { searchParams: Promise<Search> }) {
  const raw = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const parsed = listProductsQuerySchema.safeParse(flat);
  const query = parsed.success ? parsed.data : listProductsQuerySchema.parse({});

  const [{ items, pagination }, categories] = await Promise.all([
    listProducts(query, "RETAIL"),
    getCategoryTree(),
  ]);

  const active = (slug?: string) => query.categorySlug === slug;

  // Current filter state → query-string, with overrides (undefined clears a key).
  const withFilters = (overrides: Record<string, string | undefined>) =>
    qs({
      categorySlug: query.categorySlug,
      sort: query.sort === "newest" ? undefined : query.sort,
      occasion: query.occasion,
      material: query.material,
      minPrice: query.minPrice != null ? String(query.minPrice) : undefined,
      maxPrice: query.maxPrice != null ? String(query.maxPrice) : undefined,
      ...overrides,
    });

  const PRICE_BANDS = [
    { label: "Under ₹1,000", minPrice: undefined, maxPrice: "999" },
    { label: "₹1,000–2,500", minPrice: "1000", maxPrice: "2500" },
    { label: "₹2,500+", minPrice: "2500", maxPrice: undefined },
  ];
  const priceActive = (b: (typeof PRICE_BANDS)[number]) =>
    String(query.minPrice ?? "") === (b.minPrice ?? "") &&
    String(query.maxPrice ?? "") === (b.maxPrice ?? "");

  const OCCASIONS = ["wedding", "festive", "daily", "office", "party", "temple"];
  const MATERIALS = [
    { label: "Gold plated", value: "gold" },
    { label: "Silver", value: "silver" },
    { label: "Antique", value: "antique" },
  ];

  const pill = (isActive: boolean) =>
    `px-3.5 py-1.5 rounded-full text-xs transition-colors ${
      isActive
        ? "bg-gold-700 text-white font-semibold"
        : "border border-ivory-300 text-ink-700 hover:border-ink-500"
    }`;
  const hasRefinements =
    query.occasion || query.material || query.minPrice != null || query.maxPrice != null;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
      <Reveal>
        <h1 className="font-display text-4xl md:text-5xl text-ink-950">Jewellery</h1>
      </Reveal>

      {/* Category pills + sort */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href={withFilters({ categorySlug: undefined })}
          className={`px-4 py-2 rounded-full text-sm transition-colors ${
            !query.categorySlug
              ? "bg-ink-950 text-white font-semibold"
              : "border border-ivory-300 text-ink-700 hover:border-ink-500"
          }`}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={withFilters({ categorySlug: c.slug })}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              active(c.slug)
                ? "bg-ink-950 text-white font-semibold"
                : "border border-ivory-300 text-ink-700 hover:border-ink-500"
            }`}
          >
            {c.name}
          </Link>
        ))}

        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-ink-400">Sort</span>
          {SORTS.map((s) => (
            <Link
              key={s.value}
              href={withFilters({ sort: s.value })}
              className={
                query.sort === s.value
                  ? "text-gold-700 underline underline-offset-4"
                  : "text-ink-500 hover:text-ink-950 transition-colors"
              }
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Refinements: price / material / occasion (server-rendered links) */}
      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2.5 text-xs">
        <span className="text-ink-400 mr-1">Price</span>
        {PRICE_BANDS.map((b) => (
          <Link
            key={b.label}
            href={withFilters(
              priceActive(b)
                ? { minPrice: undefined, maxPrice: undefined }
                : { minPrice: b.minPrice, maxPrice: b.maxPrice },
            )}
            className={pill(priceActive(b))}
          >
            {b.label}
          </Link>
        ))}
        <span className="text-ink-400 ml-3 mr-1">Material</span>
        {MATERIALS.map((m) => (
          <Link
            key={m.value}
            href={withFilters({ material: query.material === m.value ? undefined : m.value })}
            className={pill(query.material === m.value)}
          >
            {m.label}
          </Link>
        ))}
        <span className="text-ink-400 ml-3 mr-1">Occasion</span>
        {OCCASIONS.map((o) => (
          <Link
            key={o}
            href={withFilters({ occasion: query.occasion === o ? undefined : o })}
            className={`${pill(query.occasion === o)} capitalize`}
          >
            {o}
          </Link>
        ))}
        {hasRefinements && (
          <Link
            href={withFilters({
              occasion: undefined, material: undefined, minPrice: undefined, maxPrice: undefined,
            })}
            className="ml-3 text-gold-700 underline underline-offset-4"
          >
            Clear filters
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-32 text-center">
          <p className="font-display text-2xl text-ink-700">Nothing here yet.</p>
          <p className="mt-2 text-sm text-ink-400">
            Try a different category, or{" "}
            <Link href="/jewellery" className="text-gold-700 underline underline-offset-4">
              view everything
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-7">
          {items.map((p, i) => (
            <Reveal key={p.id} delay={(i % 4) * 0.05}>
              <ProductCard product={p} priority={i < 4} />
            </Reveal>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <nav className="mt-14 flex justify-center gap-2" aria-label="Pagination">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={withFilters({ page: String(n) })}
              aria-current={n === pagination.page ? "page" : undefined}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${
                n === pagination.page
                  ? "bg-ink-950 text-white font-semibold"
                  : "border border-ivory-300 text-ink-700 hover:border-ink-500"
              }`}
            >
              {n}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
