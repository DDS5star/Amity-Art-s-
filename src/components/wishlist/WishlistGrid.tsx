"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Handbag } from "@phosphor-icons/react";
import { useWishlist } from "./store";
import { useCart } from "@/components/cart/store";
import { formatINR } from "@/lib/money";

export function WishlistGrid() {
  const { items, toggle } = useWishlist();
  const add = useCart((s) => s.add);

  if (items.length === 0) {
    return (
      <div className="py-28 text-center">
        <Heart size={40} weight="thin" className="mx-auto text-ink-400" />
        <p className="mt-4 font-display text-2xl text-ink-700">Nothing saved yet.</p>
        <p className="mt-2 text-sm text-ink-500">
          Tap the heart on any piece to keep it here.{" "}
          <Link href="/jewellery" className="text-gold-700 underline underline-offset-4">
            Browse the collection
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-7">
      {items.map((item) => (
        <div key={item.productId} className="group">
          <Link href={`/product/${item.slug}`} className="block relative aspect-[4/5] rounded-xl overflow-hidden bg-ivory-100">
            {item.image && (
              <Image
                src={item.image}
                alt={item.name}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
            )}
          </Link>
          <div className="mt-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/product/${item.slug}`}
                className="text-sm text-ink-950 hover:text-gold-700 transition-colors line-clamp-1"
              >
                {item.name}
              </Link>
              <p className="text-sm text-ink-700 mt-0.5">{formatINR(item.unitPrice)}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                type="button"
                aria-label={`Add ${item.name} to cart`}
                onClick={() =>
                  add({
                    productId: item.productId,
                    variantId: null,
                    slug: item.slug,
                    name: item.name,
                    variantTitle: null,
                    unitPrice: item.unitPrice,
                    image: item.image,
                  })
                }
                className="p-2 text-ink-700 hover:text-gold-700 transition-colors active:scale-90 cursor-pointer"
              >
                <Handbag size={18} />
              </button>
              <button
                type="button"
                aria-label={`Remove ${item.name} from wishlist`}
                onClick={() => toggle(item)}
                className="p-2 text-gold-700 hover:text-ink-500 transition-colors active:scale-90 cursor-pointer"
              >
                <Heart size={18} weight="fill" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
