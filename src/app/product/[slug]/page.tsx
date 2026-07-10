import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductDetail, listProducts } from "@/server/services/catalog";
import { listProductsQuerySchema } from "@/lib/validation/catalog";
import { ApiError } from "@/lib/api";
import { Gallery } from "@/components/product/Gallery";
import { PurchasePanel } from "@/components/product/PurchasePanel";
import { ProductCard } from "@/components/product/ProductCard";
import { Reveal } from "@/components/site/Reveal";

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
    openGraph: {
      title: `${product.name} | Amity Art's`,
      description: product.shortDescription ?? undefined,
      images: product.primaryImage ? [{ url: product.primaryImage.url }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await fetchProduct(slug);

  const { items: related } = await listProducts(
    listProductsQuerySchema.parse({ categorySlug: product.category.slug, limit: 5 }),
    "RETAIL",
  );
  const relatedProducts = related.filter((p) => p.id !== product.id).slice(0, 4);

  const details: { label: string; value: string }[] = [
    ...(product.material ? [{ label: "Material", value: product.material }] : []),
    ...(product.weightGrams ? [{ label: "Weight", value: `${product.weightGrams} g` }] : []),
    { label: "Care", value: "Keep away from perfume and water. Store in the pouch provided." },
    { label: "Returns", value: "7-day easy returns on unworn pieces with tags intact." },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-14">
      <nav aria-label="Breadcrumb" className="text-xs text-bone-600 mb-6">
        <a href="/jewellery" className="hover:text-bone-300 transition-colors">
          Jewellery
        </a>
        <span className="mx-2">/</span>
        <a
          href={`/jewellery?categorySlug=${product.category.slug}`}
          className="hover:text-bone-300 transition-colors"
        >
          {product.category.name}
        </a>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
        <Gallery media={product.media} name={product.name} />

        <div className="lg:sticky lg:top-24">
          <h1 className="font-display text-3xl md:text-4xl text-bone-50">{product.name}</h1>
          {product.shortDescription && (
            <p className="mt-3 text-bone-300 leading-relaxed">{product.shortDescription}</p>
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
            />
          </div>

          <dl className="mt-10 divide-y divide-forest-800 border-t border-forest-800">
            {details.map((d) => (
              <div key={d.label} className="py-4 grid grid-cols-[110px_1fr] gap-4 text-sm">
                <dt className="text-bone-600">{d.label}</dt>
                <dd className="text-bone-300 leading-relaxed">{d.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {product.description && (
        <Reveal className="mt-20 max-w-3xl">
          <h2 className="font-display text-2xl text-bone-50 mb-4">About this piece</h2>
          <p className="text-bone-300 leading-relaxed">{product.description}</p>
        </Reveal>
      )}

      {relatedProducts.length > 0 && (
        <section className="mt-24">
          <Reveal>
            <h2 className="font-display text-3xl text-bone-50">You may also like</h2>
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
