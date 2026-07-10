import Image from "next/image";
import Link from "next/link";
import { formatINR } from "@/lib/money";

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  unitPrice: number;
  compareAtPrice: number | null;
  inStock: boolean;
  primaryImage: { url: string; thumbnailUrl: string | null; altText: string | null } | null;
  category?: { name: string } | null;
}

export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block"
      aria-label={product.name}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-forest-850">
        {product.primaryImage ? (
          <Image
            src={product.primaryImage.url}
            alt={product.primaryImage.altText ?? product.name}
            fill
            priority={priority}
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-bone-600 text-sm">
            Image coming soon
          </div>
        )}
        {!product.inStock && (
          <span className="absolute bottom-3 left-3 text-xs bg-forest-950/85 text-bone-300 px-3 py-1 rounded-full">
            Out of stock
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <p className="text-sm text-bone-100 group-hover:text-amber-soft transition-colors line-clamp-1">
          {product.name}
        </p>
        <p className="text-sm text-bone-300 whitespace-nowrap">
          {formatINR(product.unitPrice)}
          {product.compareAtPrice && product.compareAtPrice > product.unitPrice && (
            <span className="ml-2 text-xs text-bone-600 line-through">
              {formatINR(product.compareAtPrice)}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
