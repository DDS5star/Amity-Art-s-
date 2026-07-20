import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductDetail, listProducts } from "@/server/services/catalog";
import { listProductsQuerySchema } from "@/lib/validation/catalog";
import { getSetting } from "@/server/services/settings";
import { ApiError } from "@/lib/api";
import { Gallery } from "@/components/product/Gallery";
import { PurchasePanel } from "@/components/product/PurchasePanel";
import { ProductCard } from "@/components/product/ProductCard";
import { Reveal } from "@/components/site/Reveal";
import { Accordion } from "@/components/site/Accordion";
import { JsonLd, productLd, breadcrumbLd } from "@/components/seo/JsonLd";

type Params = { params: Promise<{ slug: string }> };

async function fetchProduct(slug: string) {
  try {
    return await getProductDetail(slug, "RETAIL");
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  return {
    title: product.name,
    description: product.shortDescription ?? undefined,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: `${product.name} | Amity Arts`,
      description: product.shortDescription ?? undefined,
      images: product.primaryImage ? [{ url: product.primaryImage.url }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const [product, whatsappNumber] = await Promise.all([
    fetchProduct(slug),
    getSetting("store.whatsappNumber", ""),
  ]);

  const { items: related } = await listProducts(
    listProductsQuerySchema.parse({ categorySlug: product.category.slug, limit: 5 }),
    "RETAIL",
  );
  const relatedProducts = related.filter((p) => p.id !== product.id).slice(0, 4);

  // Craft & Details spec grid (Mortantra pattern), from real product data.
  const specs: { label: string; value: string }[] = [
    { label: "Type", value: product.category.name },
    ...(product.material ? [{ label: "Material & craft", value: product.material }] : []),
    ...(product.occasion.length
      ? [{ label: "Occasion", value: product.occasion.map((o) => o[0].toUpperCase() + o.slice(1)).join(", ") }]
      : []),
    ...(product.weightGrams ? [{ label: "Weight", value: `${product.weightGrams} g` }] : []),
  ];

  const accordionItems = [
    ...(product.description
      ? [{ title: "Description", content: <p>{product.description}</p> }]
      : []),
    {
      title: "Shipping",
      content: (
        <p>
          Dispatched from our Mumbai workshop in 2-3 working days, tracked and
          insured. Use the pincode checker above for a delivery window; shipping
          is free above the threshold shown for your zone.
        </p>
      ),
    },
    {
      title: "Returns & exchange",
      content: (
        <p>
          7-day easy returns on unworn pieces with tags intact. Exchanges are
          processed within 48 hours of the piece reaching us.
        </p>
      ),
    },
    {
      title: "Jewellery care",
      content: (
        <p>
          Keep away from perfume, hairspray and water. Wipe with the soft cloth
          provided and store in the pouch. Your plating is covered by a one-year
          warranty.
        </p>
      ),
    },
    {
      title: "Size guide",
      content: (
        <p>
          Bangle sizes are inner diameter in inches: 2.2 fits most small wrists,
          2.4 medium, 2.6 large, 2.8 extra large. Unsure? Chat with us and we
          will size you from a photo of a bangle you already own.
        </p>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-14">
      <JsonLd
        data={productLd({
          name: product.name,
          slug: product.slug,
          description: product.shortDescription,
          image: product.primaryImage?.url ?? null,
          sku: product.sku,
          price: product.unitPrice,
          inStock: product.inStock,
          material: product.material,
          ratingAvg: product.rating.avg,
          ratingCount: product.rating.count,
        })}
      />
      <JsonLd
        data={breadcrumbLd([
          { name: "Jewellery", path: "/jewellery" },
          { name: product.category.name, path: `/jewellery?categorySlug=${product.category.slug}` },
          { name: product.name, path: `/product/${product.slug}` },
        ])}
      />
      <nav aria-label="Breadcrumb" className="text-xs text-ink-400 mb-6">
        <a href="/jewellery" className="hover:text-ink-700 transition-colors">
          Jewellery
        </a>
        <span className="mx-2">/</span>
        <a
          href={`/jewellery?categorySlug=${product.category.slug}`}
          className="hover:text-ink-700 transition-colors"
        >
          {product.category.name}
        </a>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
        <Gallery media={product.media} name={product.name} />

        <div>
          <h1 className="font-display text-3xl md:text-4xl text-ink-950">{product.name}</h1>
          {product.shortDescription && (
            <p className="mt-3 text-ink-700 leading-relaxed">{product.shortDescription}</p>
          )}

          <div className="mt-6">
            <PurchasePanel
              product={{
                id: product.id,
                name: product.name,
                slug: product.slug,
                unitPrice: product.unitPrice,
                compareAtPrice: product.compareAtPrice,
                inStock: product.inStock,
                imageUrl: product.primaryImage?.url ?? product.media[0]?.url ?? null,
              }}
              variants={product.variants}
              whatsappNumber={whatsappNumber}
            />
          </div>

          {/* Craft & Details */}
          {specs.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xs uppercase tracking-[0.18em] text-ink-500 mb-4">
                Craft &amp; details
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {specs.map((s) => (
                  <div key={s.label} className="rounded-xl bg-ivory-100 border border-ivory-200 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-ink-400">{s.label}</p>
                    <p className="mt-1 text-sm text-ink-950 leading-snug">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10">
            <Accordion items={accordionItems} defaultOpen={null} />
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="mt-24">
          <Reveal>
            <h2 className="font-display text-3xl text-ink-950">You may also like</h2>
          </Reveal>
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-7">
            {relatedProducts.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.06}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
