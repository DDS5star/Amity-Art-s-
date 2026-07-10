import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/server/db";
import { listProducts } from "@/server/services/catalog";
import { listProductsQuerySchema } from "@/lib/validation/catalog";
import { ProductCard } from "@/components/product/ProductCard";
import { Reveal } from "@/components/site/Reveal";
import { NewsletterForm } from "./NewsletterForm";

/* Server sections for the homepage. Each uses a distinct layout family. */

// ── Category rail: horizontal scroll-snap ──
export async function CategoryRail() {
  const categories = await prisma.category.findMany({
    where: { deletedAt: null, isActive: true, depth: 0 },
    orderBy: { sortOrder: "asc" },
    take: 6,
  });

  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <Reveal>
          <h2 className="font-display text-3xl md:text-4xl text-bone-50">
            Browse by category
          </h2>
        </Reveal>
      </div>
      <div className="mt-10 overflow-x-auto snap-x snap-mandatory scrollbar-none">
        <div className="flex gap-5 px-4 md:px-8 w-max">
          {categories.map((c, i) => (
            <Link
              key={c.id}
              href={`/jewellery?categorySlug=${c.slug}`}
              className="group snap-start shrink-0 w-[240px] md:w-[300px]"
            >
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-forest-850">
                <Image
                  src={c.imageUrl ?? `https://picsum.photos/seed/amity-${c.slug}/600/800`}
                  alt={c.name}
                  fill
                  sizes="300px"
                  priority={i < 2}
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forest-950/80 via-transparent" />
                <p className="absolute bottom-4 left-4 font-display text-2xl text-bone-50">
                  {c.name}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Best sellers: standard 4-up grid ──
export async function BestSellers() {
  const { items } = await listProducts(
    listProductsQuerySchema.parse({ limit: 4, bestSeller: true, sort: "popular" }),
    "RETAIL",
  );
  if (items.length === 0) return null;

  return (
    <section className="py-24 bg-forest-900">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-end justify-between gap-6">
          <Reveal>
            <h2 className="font-display text-3xl md:text-4xl text-bone-50">Best sellers</h2>
          </Reveal>
          <Link
            href="/jewellery?bestSeller=true"
            className="text-sm text-bone-500 hover:text-amber-soft transition-colors whitespace-nowrap"
          >
            View all
          </Link>
        </div>
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-7">
          {items.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.06}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Brand story: full-width editorial ──
export function BrandStory() {
  return (
    <section id="story" className="py-28 md:py-36">
      <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
        <Reveal>
          <h2 className="font-display text-4xl md:text-5xl leading-[1.15] text-bone-50">
            Every piece passes through
            <br />
            <em className="italic text-amber-soft leading-[1.1] inline-block pb-1">
              fourteen pairs
            </em>{" "}
            of hands.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-8 text-bone-300 leading-relaxed max-w-[52ch] mx-auto">
            From the first wax mould to the final polish, our karigars in Mumbai
            shape each design the way their fathers taught them. We plate over
            nickel-free brass, set every stone by hand, and stand behind it all
            with a one-year plating warranty.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ── New arrivals: asymmetric feature + column ──
export async function NewArrivals() {
  const { items } = await listProducts(
    listProductsQuerySchema.parse({ limit: 3, newArrival: true, sort: "newest" }),
    "RETAIL",
  );
  if (items.length === 0) return null;
  const [featured, ...rest] = items;

  return (
    <section className="py-24 bg-forest-900">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <Reveal>
          <h2 className="font-display text-3xl md:text-4xl text-bone-50">New this season</h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-5 md:gap-7">
          <Reveal>
            <Link href={`/product/${featured.slug}`} className="group block relative aspect-[4/3] md:aspect-auto md:h-full min-h-[320px] rounded-xl overflow-hidden bg-forest-850">
              {featured.primaryImage && (
                <Image
                  src={featured.primaryImage.url}
                  alt={featured.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-forest-950/85 via-transparent" />
              <div className="absolute bottom-6 left-6">
                <p className="font-display text-3xl text-bone-50">{featured.name}</p>
                <p className="mt-1 text-bone-300 text-sm">{featured.shortDescription}</p>
              </div>
            </Link>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-1 gap-5 md:gap-7">
            {rest.map((p, i) => (
              <Reveal key={p.id} delay={0.08 + i * 0.06}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Testimonials: one lead quote + two supporting, asymmetric ──
export async function Testimonials() {
  const testimonials = await prisma.testimonial.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    take: 3,
  });
  if (testimonials.length === 0) return null;
  const [lead, ...others] = testimonials;

  return (
    <section className="py-28">
      <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <Reveal className="lg:col-span-7">
          <blockquote>
            <p className="font-display text-3xl md:text-4xl leading-snug text-bone-50">
              &ldquo;{lead.content}&rdquo;
            </p>
            <footer className="mt-6 flex items-center gap-3">
              {lead.imageUrl && (
                <Image
                  src={lead.imageUrl}
                  alt={lead.name}
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
              )}
              <span className="text-sm text-bone-500">
                {lead.name}, verified buyer
              </span>
            </footer>
          </blockquote>
        </Reveal>
        <div className="lg:col-span-4 lg:col-start-9 space-y-10 lg:pt-10">
          {others.map((t, i) => (
            <Reveal key={t.id} delay={0.1 + i * 0.08}>
              <blockquote className="border-l border-forest-700 pl-5">
                <p className="text-bone-300 leading-relaxed">&ldquo;{t.content}&rdquo;</p>
                <footer className="mt-3 text-sm text-bone-600">{t.name}, verified buyer</footer>
              </blockquote>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Newsletter band ──
export function Newsletter() {
  return (
    <section className="border-t border-forest-800 bg-forest-900">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-20 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <Reveal>
          <h2 className="font-display text-3xl md:text-4xl text-bone-50">
            First look at new drops
          </h2>
          <p className="mt-3 text-bone-500 text-sm max-w-[40ch]">
            One email a month. New collections, restocks and nothing else.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <NewsletterForm />
        </Reveal>
      </div>
    </section>
  );
}
