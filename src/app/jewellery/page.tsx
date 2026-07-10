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

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
      <Reveal>
        <h1 className="font-display text-4xl md:text-5xl text-bone-50">Jewellery</h1>
      </Reveal>

      {/* Category pills + sort */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/jewellery"
          className={`px-4 py-2 rounded-full text-sm transition-colors ${
            !query.categorySlug
              ? "bg-bone-100 text-forest-950 font-semibold"
              : "border border-forest-700 text-bone-300 hover:border-bone-500"
          }`}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={qs({ categorySlug: c.slug, sort: query.sort })}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              active(c.slug)
                ? "bg-bone-100 text-forest-950 font-semibold"
                : "border border-forest-700 text-bone-300 hover:border-bone-500"
            }`}
          >
            {c.name}
          </Link>
        ))}

        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-bone-600">Sort</span>
          {SORTS.map((s) => (
            <Link
              key={s.value}
              href={qs({ categorySlug: query.categorySlug, sort: s.value })}
              className={
                query.sort === s.value
                  ? "text-amber-soft underline underline-offset-4"
                  : "text-bone-500 hover:text-bone-100 transition-colors"
              }
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-32 text-center">
          <p className="font-display text-2xl text-bone-300">Nothing here yet.</p>
          <p className="mt-2 text-sm text-bone-600">
            Try a different category, or{" "}
            <Link href="/jewellery" className="text-amber-soft underline underline-offset-4">
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
              href={qs({
                categorySlug: query.categorySlug,
                sort: query.sort,
                page: String(n),
              })}
              aria-current={n === pagination.page ? "page" : undefined}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${
                n === pagination.page
                  ? "bg-bone-100 text-forest-950 font-semibold"
                  : "border border-forest-700 text-bone-300 hover:border-bone-500"
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
