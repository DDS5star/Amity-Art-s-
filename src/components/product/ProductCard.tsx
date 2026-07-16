"use client";

import Image from "next/image";
import Link from "next/link";
import { Handbag, Heart } from "@phosphor-icons/react";
import { formatINR } from "@/lib/money";
import { useCart } from "@/components/cart/store";
import { useWishlist } from "@/components/wishlist/store";

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  unitPrice: number;
  compareAtPrice: number | null;
  inStock: boolean;
  hasVariants: boolean;
  primaryImage: { url: string; thumbnailUrl: string | null; altText: string | null } | null;
  hoverImage?: { url: string } | null;
  category?: { name: string } | null;
}

export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const add = useCart((s) => s.add);
  const toggleWish = useWishlist((s) => s.toggle);
  const wished = useWishlist((s) => s.items.some((i) => i.productId === product.id));

  const quickAddable = product.inStock && !product.hasVariants;

  const wishItem = {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    unitPrice: product.unitPrice,
    image: product.primaryImage?.url ?? null,
  };

  return (
    <div className="group relative">
      <Link href={`/product/${product.slug}`} aria-label={product.name} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-ivory-100">
          {product.primaryImage ? (
            <>
              <Image
                src={product.primaryImage.url}
                alt={product.primaryImage.altText ?? product.name}
                fill
                priority={priority}
                sizes="(max-width: 768px) 50vw, 25vw"
                className={`object-cover transition-all duration-700 ease-out group-hover:scale-[1.04] ${
                  product.hoverImage ? "group-hover:opacity-0" : ""
                }`}
              />
              {product.hoverImage && (
                <Image
                  src={product.hoverImage.url}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover opacity-0 scale-[1.04] transition-all duration-700 ease-out group-hover:opacity-100 group-hover:scale-100"
                />
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-ink-400 text-sm">
              Image coming soon
            </div>
          )}
          {!product.inStock && (
            <span className="absolute bottom-3 left-3 text-xs bg-ink-950/85 text-ivory-100 px-3 py-1 rounded-full">
              Out of stock
            </span>
          )}
        </div>
      </Link>

      {/* Hover actions (Meermankaa-style quick add) */}
      <div className="absolute top-3 right-3 flex flex-col gap-2">
        <button
          type="button"
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          onClick={() => toggleWish(wishItem)}
          className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-all active:scale-90 ${
            wished
              ? "bg-gold-700 text-white"
              : "bg-white/95 text-ink-800 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-gold-700"
          }`}
        >
          <Heart size={16} weight={wished ? "fill" : "regular"} />
        </button>
        {quickAddable && (
          <button
            type="button"
            aria-label={`Add ${product.name} to cart`}
            onClick={() =>
              add({
                productId: product.id,
                variantId: null,
                slug: product.slug,
                name: product.name,
                variantTitle: null,
                unitPrice: product.unitPrice,
                image: product.primaryImage?.url ?? null,
              })
            }
            className="w-9 h-9 rounded-full bg-white/95 text-ink-800 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-gold-700 transition-all active:scale-90"
          >
            <Handbag size={16} />
          </button>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <Link
          href={`/product/${product.slug}`}
          className="text-sm text-ink-950 group-hover:text-gold-700 transition-colors line-clamp-1"
        >
          {product.name}
        </Link>
        <p className="text-sm text-ink-700 whitespace-nowrap">
          {formatINR(product.unitPrice)}
          {product.compareAtPrice && product.compareAtPrice > product.unitPrice && (
            <span className="ml-2 text-xs text-ink-400 line-through">
              {formatINR(product.compareAtPrice)}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
