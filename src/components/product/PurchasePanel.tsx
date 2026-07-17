"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Minus, Plus, Heart, ChatCircleText, Phone, EnvelopeSimple, Package } from "@phosphor-icons/react";
import { useCart } from "@/components/cart/store";
import { useWishlist } from "@/components/wishlist/store";
import { formatINR } from "@/lib/money";
import { DeliveryEstimator } from "./DeliveryEstimator";

interface VariantAttr {
  attribute: string;
  code: string;
  isSizeAxis: boolean;
  value: string;
  valueCode: string;
  swatchHex: string | null;
}

interface Variant {
  id: string;
  sku: string;
  title: string;
  stockQty: number;
  unitPrice: number;
  attributes: VariantAttr[];
}

interface Props {
  product: {
    id: string;
    name: string;
    slug: string;
    unitPrice: number;
    compareAtPrice: number | null;
    inStock: boolean;
    imageUrl: string | null;
    minOrderQty?: number;
    maxOrderQty?: number | null;
  };
  variants: Variant[];
  whatsappNumber?: string;
}

export function PurchasePanel({ product, variants, whatsappNumber }: Props) {
  const axes = useMemo(() => {
    const map = new Map<
      string,
      { name: string; isSizeAxis: boolean; values: Map<string, VariantAttr> }
    >();
    for (const v of variants) {
      for (const a of v.attributes) {
        if (!map.has(a.code)) {
          map.set(a.code, { name: a.attribute, isSizeAxis: a.isSizeAxis, values: new Map() });
        }
        map.get(a.code)!.values.set(a.valueCode, a);
      }
    }
    return [...map.entries()]
      .map(([code, ax]) => ({ code, ...ax, values: [...ax.values.values()] }))
      .sort((a, b) => Number(a.isSizeAxis) - Number(b.isSizeAxis));
  }, [variants]);

  const firstAvailable = variants.find((v) => v.stockQty > 0) ?? variants[0];
  const [selection, setSelection] = useState<Record<string, string>>(() =>
    Object.fromEntries(firstAvailable?.attributes.map((a) => [a.code, a.valueCode]) ?? []),
  );
  const [qty, setQty] = useState(1);

  const selected = useMemo(
    () => variants.find((v) => v.attributes.every((a) => selection[a.code] === a.valueCode)) ?? null,
    [variants, selection],
  );

  const hasVariants = variants.length > 0;
  const price = selected?.unitPrice ?? product.unitPrice;
  const stockQty = hasVariants ? selected?.stockQty ?? 0 : null;
  const inStock = hasVariants ? (stockQty ?? 0) > 0 : product.inStock;
  const add = useCart((s) => s.add);
  const toggleWish = useWishlist((s) => s.toggle);
  const wished = useWishlist((s) => s.items.some((i) => i.productId === product.id));

  const addToCart = () => {
    add(
      {
        productId: product.id,
        variantId: selected?.id ?? null,
        slug: product.slug,
        name: product.name,
        variantTitle: selected?.title ?? null,
        unitPrice: price,
        image: product.imageUrl,
      },
      qty,
    );
  };

  // Sticky add-to-cart bar (Mortantra pattern): appears after the panel scrolls away.
  const anchorRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting), {
      rootMargin: "-80px 0px 0px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <p className="text-2xl text-ink-950 font-semibold">{formatINR(price)}</p>
        {product.compareAtPrice && product.compareAtPrice > price && (
          <p className="text-ink-400 line-through">{formatINR(product.compareAtPrice)}</p>
        )}
        <p className="text-xs text-ink-500">incl. of all taxes</p>
      </div>

      {/* Dispatch + scarcity signals */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs bg-ivory-100 border border-ivory-200 text-ink-700 px-3 py-1.5 rounded-full">
          <Package size={14} className="text-gold-700" />
          {inStock ? "Ready to ship · dispatch in 2-3 days" : "Made to order · allow 7 extra days"}
        </span>
        {stockQty != null && stockQty > 0 && stockQty <= 10 && (
          <span className="text-xs text-gold-800 bg-gold-100 px-3 py-1.5 rounded-full font-medium">
            Only {stockQty} left in this option
          </span>
        )}
      </div>

      {axes.map((axis) => (
        <fieldset key={axis.code} className="mt-6">
          <legend className="text-sm text-ink-700 mb-2">
            {axis.name}
            {selection[axis.code] && (
              <span className="text-ink-400">
                {" "}
                · {axis.values.find((v) => v.valueCode === selection[axis.code])?.value}
              </span>
            )}
          </legend>
          <div className="flex flex-wrap gap-2">
            {axis.values.map((v) => {
              const isActive = selection[axis.code] === v.valueCode;
              return (
                <button
                  key={v.valueCode}
                  type="button"
                  onClick={() => setSelection((s) => ({ ...s, [axis.code]: v.valueCode }))}
                  aria-pressed={isActive}
                  className={`min-w-11 min-h-11 px-3.5 py-2 rounded-full text-sm transition-all active:scale-[0.97] cursor-pointer ${
                    isActive
                      ? "bg-ink-950 text-white font-semibold"
                      : "border border-ivory-300 text-ink-700 hover:border-ink-500"
                  }`}
                >
                  {v.swatchHex && (
                    <span
                      aria-hidden
                      className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle border border-black/20"
                      style={{ backgroundColor: v.swatchHex }}
                    />
                  )}
                  {v.value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="mt-8 flex items-center gap-3">
        <div className="flex items-center border border-ivory-300 rounded-full bg-white">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQty((q) => Math.max(product.minOrderQty ?? 1, q - 1))}
            className="p-3 text-ink-500 hover:text-ink-950 cursor-pointer"
          >
            <Minus size={14} />
          </button>
          <span className="w-8 text-center text-sm text-ink-950">{qty}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQty((q) => Math.min(product.maxOrderQty ?? 10, q + 1))}
            className="p-3 text-ink-500 hover:text-ink-950 cursor-pointer"
          >
            <Plus size={14} />
          </button>
        </div>
        <button
          type="button"
          disabled={!inStock}
          onClick={addToCart}
          className="cta-shimmer flex-1 py-3.5 rounded-full bg-gold-700 text-white text-sm font-semibold hover:bg-gold-800 transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {inStock ? "Add to cart" : "Out of stock"}
        </button>
        <button
          type="button"
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          onClick={() =>
            toggleWish({
              productId: product.id,
              slug: product.slug,
              name: product.name,
              unitPrice: price,
              image: product.imageUrl,
            })
          }
          className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
            wished
              ? "bg-gold-700 border-gold-700 text-white"
              : "border-ivory-300 text-ink-700 hover:border-gold-700 hover:text-gold-700"
          }`}
        >
          <Heart size={18} weight={wished ? "fill" : "regular"} />
        </button>
      </div>

      {hasVariants && selected && (
        <p className="mt-3 text-xs text-ink-400">SKU {selected.sku}</p>
      )}

      <div className="mt-8 border-t border-ivory-200 pt-6">
        <DeliveryEstimator productId={product.id} variantId={selected?.id} />
      </div>

      {/* Assistance strip (Mortantra pattern) */}
      <div className="mt-6 rounded-xl bg-ivory-100 border border-ivory-200 px-5 py-4">
        <p className="text-xs text-ink-500">Need assistance, customisation or expedited delivery?</p>
        <div className="mt-2 flex items-center gap-5 text-sm">
          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-ink-800 hover:text-gold-700 transition-colors"
            >
              <ChatCircleText size={16} /> Chat
            </a>
          )}
          <a
            href="tel:+919322239603"
            className="inline-flex items-center gap-1.5 text-ink-800 hover:text-gold-700 transition-colors"
          >
            <Phone size={16} /> Call
          </a>
          <a
            href="mailto:hello@amityarts.in"
            className="inline-flex items-center gap-1.5 text-ink-800 hover:text-gold-700 transition-colors"
          >
            <EnvelopeSimple size={16} /> Email
          </a>
        </div>
      </div>

      {/* Sticky bar sentinel */}
      <div ref={anchorRef} aria-hidden className="h-px" />

      <AnimatePresence>
        {showSticky && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { y: 72, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 72, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-ivory-200 shadow-[0_-8px_24px_-16px_rgb(25_22_18/0.25)]"
          >
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center gap-4">
              {product.imageUrl && (
                <Image
                  src={product.imageUrl}
                  alt=""
                  width={44}
                  height={55}
                  className="w-11 h-[55px] rounded-md object-cover hidden sm:block"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-950 font-medium line-clamp-1">{product.name}</p>
                <p className="text-sm text-ink-700">
                  {formatINR(price)}
                  {selected && <span className="text-ink-400 text-xs ml-2">{selected.title}</span>}
                </p>
              </div>
              <button
                type="button"
                disabled={!inStock}
                onClick={addToCart}
                className="px-6 py-3 rounded-full bg-gold-700 text-white text-sm font-semibold hover:bg-gold-800 transition-colors active:scale-[0.98] disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {inStock ? "Add to cart" : "Out of stock"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
