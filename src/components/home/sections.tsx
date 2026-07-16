import Image from "next/image";
import Link from "next/link";
import { Medal, HandHeart, Truck, Invoice } from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/server/db";
import { listProducts } from "@/server/services/catalog";
import { listProductsQuerySchema } from "@/lib/validation/catalog";
import { ProductCard } from "@/components/product/ProductCard";
import { Reveal } from "@/components/site/Reveal";
import { NewsletterForm } from "./NewsletterForm";

/* Server sections for the homepage. Each uses a distinct layout family. */

// ── Trust strip (Mortantra pattern): warranty / handcrafted / shipping / GST ──
const TRUST_ITEMS = [
  { icon: Medal, title: "1-year plating warranty", body: "On every piece we make" },
  { icon: HandHeart, title: "Handcrafted in India", body: "By karigars in Mumbai" },
  { icon: Truck, title: "Shipping nationwide", body: "Tracked and insured" },
  { icon: Invoice, title: "GST invoice included", body: "Retail and wholesale" },
];

export function TrustStrip() {
  return (
    <section className="border-y border-ivory-200 bg-ivory-100">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
        {TRUST_ITEMS.map((item, i) => (
          <Reveal key={item.title} delay={i * 0.05} className="flex items-start gap-3">
            <item.icon size={26} weight="light" className="text-gold-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-ink-950">{item.title}</p>
              <p className="text-xs text-ink-500 mt-0.5">{item.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

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
          <h2 className="font-display text-3xl md:text-4xl text-ink-950">Browse by category</h2>
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
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-ivory-100">
                <Image
                  src={c.imageUrl ?? `https://picsum.photos/seed/amity-${c.slug}/600/800`}
                  alt={c.name}
                  fill
                  sizes="300px"
                  priority={i < 2}
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent" />
                <p className="absolute bottom-4 left-4 font-display text-2xl text-white">
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
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-end justify-between gap-6">
          <Reveal>
            <h2 className="font-display text-3xl md:text-4xl text-ink-950">Best sellers</h2>
          </Reveal>
          <Link
            href="/jewellery?bestSeller=true"
            className="text-sm text-ink-500 hover:text-gold-700 transition-colors whitespace-nowrap"
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

// ── Brand story: single deliberate dark color-block (once per page) ──
export function BrandStory() {
  return (
    <section id="story" className="bg-ink-950 py-28 md:py-36">
      <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
        <Reveal>
          <h2 className="font-display text-4xl md:text-5xl leading-[1.15] text-ivory-50">
            Every piece passes through
            <br />
            <em className="italic text-gold-500 leading-[1.1] inline-block pb-1">
              fourteen pairs
            </em>{" "}
            of hands.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-8 text-ivory-200 leading-relaxed max-w-[52ch] mx-auto">
            From the first wax mould to the final polish, our karigars shape each
            design the way their fathers taught them. We plate over nickel-free
            brass, set every stone by hand, and stand behind it all with a
            one-year plating warranty.
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
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <Reveal>
          <h2 className="font-display text-3xl md:text-4xl text-ink-950">New this season</h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-5 md:gap-7">
          <Reveal>
            <Link
              href={`/product/${featured.slug}`}
              className="group block relative aspect-[4/3] md:aspect-auto md:h-full min-h-[320px] rounded-xl overflow-hidden bg-ivory-100"
            >
              {featured.primaryImage && (
                <Image
                  src={featured.primaryImage.url}
                  alt={featured.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/75 via-transparent" />
              <div className="absolute bottom-6 left-6">
                <p className="font-display text-3xl text-white">{featured.name}</p>
                <p className="mt-1 text-ivory-200 text-sm">{featured.shortDescription}</p>
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
    <section className="py-28 bg-white border-y border-ivory-200">
      <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <Reveal className="lg:col-span-7">
          <blockquote>
            <p className="font-display text-3xl md:text-4xl leading-snug text-ink-950">
              &ldquo;{lead.content}&rdquo;
            </p>
            <footer className="mt-6 flex items-center gap-3">
              {lead.imageUrl && (
                <Image
                  src={lead.imageUrl}
                  alt={lead.name}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
              <span className="text-sm text-ink-500">{lead.name}, verified buyer</span>
            </footer>
          </blockquote>
        </Reveal>
        <div className="lg:col-span-4 lg:col-start-9 space-y-10 lg:pt-10">
          {others.map((t, i) => (
            <Reveal key={t.id} delay={0.1 + i * 0.08}>
              <blockquote className="border-l-2 border-gold-600 pl-5">
                <p className="text-ink-700 leading-relaxed">&ldquo;{t.content}&rdquo;</p>
                <footer className="mt-3 text-sm text-ink-400">{t.name}, verified buyer</footer>
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
    <section className="bg-ivory-100">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-20 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <Reveal>
          <h2 className="font-display text-3xl md:text-4xl text-ink-950">
            First look at new drops
          </h2>
          <p className="mt-3 text-ink-500 text-sm max-w-[40ch]">
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
